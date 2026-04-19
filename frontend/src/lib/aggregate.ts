import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { compareResolution, RESOLUTION_ORDER } from './resolutionOrder';
import { compareYearWeek, toIsoYearWeek } from './weekFormat';
import type { Filters, Incident, TimeUnit } from '../types';

dayjs.extend(quarterOfYear);

export function ensureYearWeek(i: Incident): string | null {
  return i.yearWeek ?? toIsoYearWeek(i.createdAt);
}

export function applyFilters(all: Incident[], f: Filters): Incident[] {
  const from = f.dateFrom ? dayjs(f.dateFrom).startOf('day') : null;
  const to = f.dateTo ? dayjs(f.dateTo).endOf('day') : null;

  return all.filter((i) => {
    if (f.clientTypes.length && (!i.clientType || !f.clientTypes.includes(i.clientType))) return false;
    if (f.clients.length && (!i.client || !f.clients.includes(i.client))) return false;
    if (f.statuses.length && (!i.status || !f.statuses.includes(i.status))) return false;
    if (f.regions.length && (!i.region || !f.regions.includes(i.region))) return false;
    if (f.resolutionBuckets.length && (!i.resolutionBucket || !f.resolutionBuckets.includes(i.resolutionBucket))) {
      return false;
    }
    if (f.eiIds.length && !f.eiIds.includes(i.eiId)) return false;
    if (f.miIds.length && (!i.miId || !f.miIds.includes(i.miId))) return false;
    if (f.slaEi.length && (!i.slaEi || !f.slaEi.includes(i.slaEi))) return false;
    if (f.slaMi.length && (!i.slaMi || !f.slaMi.includes(i.slaMi))) return false;

    if (from || to) {
      if (!i.createdAt) return false;
      const d = dayjs(i.createdAt);
      if (from && d.isBefore(from)) return false;
      if (to && d.isAfter(to)) return false;
    }
    return true;
  });
}

export interface KpiStats {
  totalEi: number;
  open: number;
  resolved: number;
  received: number;
  avgResolutionHours: number | null;
}

export function computeKpi(list: Incident[]): KpiStats {
  const totalEi = new Set(list.map((i) => i.eiId)).size;
  const open = list.reduce((acc, i) => acc + (i.countOpen ? 1 : 0), 0);
  const resolved = list.reduce((acc, i) => acc + (i.countResolved ? 1 : 0), 0);
  const received = list.reduce((acc, i) => acc + (i.countReceived ? 1 : 0), 0);
  const durations = list.map((i) => i.resolutionHours).filter((v): v is number => typeof v === 'number');
  const avg = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : null;
  return { totalEi, open, resolved, received, avgResolutionHours: avg };
}

export type PeriodKey = { key: string; label: string; order: number };

export function periodKey(date: string | null | undefined, unit: TimeUnit): PeriodKey | null {
  if (!date) return null;
  const d = dayjs(date);
  if (!d.isValid()) return null;
  switch (unit) {
    case 'day':
      return { key: d.format('YYYY-MM-DD'), label: d.format('YYYY-MM-DD'), order: d.valueOf() };
    case 'week': {
      const label = toIsoYearWeek(d.toDate()) ?? '';
      return { key: label, label, order: d.isoWeekYear() * 100 + d.isoWeek() };
    }
    case 'month':
      return { key: d.format('YYYY-MM'), label: d.format('MMM YYYY'), order: d.year() * 12 + d.month() };
    case 'quarter':
      return { key: `${d.year()}-Q${d.quarter()}`, label: `${d.year()} Q${d.quarter()}`, order: d.year() * 10 + d.quarter() };
    case 'year':
      return { key: String(d.year()), label: String(d.year()), order: d.year() };
  }
}

export interface MonthlySeries {
  labels: string[];
  received: number[];
  resolved: number[];
  open: number[];
  avgResolution: (number | null)[];
  withMi: number[];
  withSla: number[];
}

export function computeMonthly(list: Incident[], unit: TimeUnit = 'month'): MonthlySeries {
  const byPeriod = new Map<string, { label: string; order: number; items: Incident[] }>();
  for (const i of list) {
    const p = periodKey(i.createdAt, unit);
    if (!p) continue;
    const bucket = byPeriod.get(p.key) ?? { label: p.label, order: p.order, items: [] };
    bucket.items.push(i);
    byPeriod.set(p.key, bucket);
  }
  const ordered = Array.from(byPeriod.entries()).sort((a, b) => a[1].order - b[1].order);
  const labels = ordered.map(([, v]) => v.label);
  const received = ordered.map(([, v]) => v.items.reduce((a, x) => a + (x.countReceived ? 1 : 0), 0));
  const resolved = ordered.map(([, v]) => v.items.reduce((a, x) => a + (x.countResolved ? 1 : 0), 0));
  const open = ordered.map(([, v]) => v.items.reduce((a, x) => a + (x.countOpen ? 1 : 0), 0));
  const avgResolution = ordered.map(([, v]) => {
    const nums = v.items.map((x) => x.resolutionHours).filter((n): n is number => typeof n === 'number');
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  });
  const withMi = ordered.map(([, v]) => v.items.filter((x) => !!x.miId).length);
  const withSla = ordered.map(([, v]) => v.items.filter((x) => !!x.slaEi).length);
  return { labels, received, resolved, open, avgResolution, withMi, withSla };
}

export interface PivotCell {
  count: number;
  percent: number;
}

export interface Pivot {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, PivotCell>>;
  totals: Record<string, PivotCell>;
}

function buildPivot(
  list: Incident[],
  getRow: (i: Incident) => string | null,
  rowOrder: (a: string, b: string) => number,
  emptyRowLabel = '—',
): Pivot {
  const columnSet = new Set<string>();
  const rowSet = new Set<string>();
  const rowColMap = new Map<string, Map<string, number>>();

  for (const i of list) {
    const col = ensureYearWeek(i);
    const row = getRow(i) ?? emptyRowLabel;
    if (!col) continue;
    columnSet.add(col);
    rowSet.add(row);
    let rowMap = rowColMap.get(row);
    if (!rowMap) {
      rowMap = new Map();
      rowColMap.set(row, rowMap);
    }
    rowMap.set(col, (rowMap.get(col) ?? 0) + 1);
  }

  const columns = Array.from(columnSet).sort(compareYearWeek);
  const rows = Array.from(rowSet).sort(rowOrder);

  const colTotals = new Map<string, number>();
  for (const col of columns) {
    let total = 0;
    for (const row of rows) {
      total += rowColMap.get(row)?.get(col) ?? 0;
    }
    colTotals.set(col, total);
  }

  const data: Record<string, Record<string, PivotCell>> = {};
  for (const row of rows) {
    const perRow: Record<string, PivotCell> = {};
    for (const col of columns) {
      const count = rowColMap.get(row)?.get(col) ?? 0;
      const total = colTotals.get(col) ?? 0;
      perRow[col] = {
        count,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      };
    }
    data[row] = perRow;
  }

  const totals: Record<string, PivotCell> = {};
  for (const col of columns) {
    totals[col] = { count: colTotals.get(col) ?? 0, percent: colTotals.get(col) ? 100 : 0 };
  }
  return { columns, rows, data, totals };
}

export function pivotBySubstatus(list: Incident[]): Pivot {
  return buildPivot(list, (i) => i.substatus, (a, b) => a.localeCompare(b, 'ru'));
}

export function pivotByResolution(list: Incident[]): Pivot {
  const order = [...RESOLUTION_ORDER, '—'];
  return buildPivot(
    list,
    (i) => i.resolutionBucket,
    (a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      const aa = ai === -1 ? order.length : ai;
      const bb = bi === -1 ? order.length : bi;
      return aa - bb;
    },
  );
}

export function sortedDistinct<T>(arr: Iterable<T>, compareFn?: (a: T, b: T) => number): T[] {
  const set = new Set<T>();
  for (const v of arr) set.add(v);
  const list = Array.from(set);
  if (compareFn) list.sort(compareFn);
  else list.sort();
  return list;
}

export const ResolutionComparator = compareResolution;
