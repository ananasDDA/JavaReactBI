import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  computeKpi,
  computeMonthly,
  pivotByResolution,
  pivotBySubstatus,
} from './aggregate';
import type { Filters, Incident } from '../types';

function mkIncident(partial: Partial<Incident>): Incident {
  return {
    eiId: 'X',
    createdAt: '2026-01-12 10:00:00',
    countReceived: 0,
    countResolved: 0,
    countOpen: 0,
    miId: null,
    workId: null,
    resolutionHours: null,
    substatus: null,
    status: null,
    client: null,
    region: null,
    groupController: null,
    groupExecutor: null,
    groupControllerMi: null,
    groupExecutorMi: null,
    weekStart: null,
    yearWeek: null,
    resolutionBucket: null,
    slaEi: null,
    slaMi: null,
    solutionMi: null,
    shortDescription: null,
    businessDescription: null,
    isOpen: false,
    clientType: 'Мобильный',
    siebelContract: null,
    modifiedAt: null,
    problemsCount: 0,
    ...partial,
  };
}

const emptyFilters: Filters = {
  clientTypes: [],
  clients: [],
  statuses: [],
  regions: [],
  resolutionBuckets: [],
  eiIds: [],
  miIds: [],
  slaEi: [],
  slaMi: [],
  dateFrom: null,
  dateTo: null,
  timeUnit: 'month',
};

describe('applyFilters', () => {
  it('passes everything when no filter is set', () => {
    const list = [mkIncident({ eiId: 'A' }), mkIncident({ eiId: 'B' })];
    expect(applyFilters(list, emptyFilters)).toHaveLength(2);
  });
  it('filters by clientType', () => {
    const list = [
      mkIncident({ eiId: 'A', clientType: 'Мобильный' }),
      mkIncident({ eiId: 'B', clientType: 'Фиксированный' }),
    ];
    const res = applyFilters(list, { ...emptyFilters, clientTypes: ['Мобильный'] });
    expect(res.map((i) => i.eiId)).toEqual(['A']);
  });
  it('filters by date range', () => {
    const list = [
      mkIncident({ eiId: 'A', createdAt: '2025-01-01 10:00:00' }),
      mkIncident({ eiId: 'B', createdAt: '2026-03-01 10:00:00' }),
    ];
    const res = applyFilters(list, { ...emptyFilters, dateFrom: '2026-01-01', dateTo: '2026-12-31' });
    expect(res.map((i) => i.eiId)).toEqual(['B']);
  });
});

describe('computeKpi', () => {
  it('counts unique EI and sums flags', () => {
    const list = [
      mkIncident({ eiId: 'A', countOpen: 1, resolutionHours: 2 }),
      mkIncident({ eiId: 'A', countOpen: 0, countResolved: 1, resolutionHours: 8 }),
      mkIncident({ eiId: 'B', countReceived: 1 }),
    ];
    const kpi = computeKpi(list);
    expect(kpi.totalEi).toBe(2);
    expect(kpi.open).toBe(1);
    expect(kpi.resolved).toBe(1);
    expect(kpi.received).toBe(1);
    expect(kpi.avgResolutionHours).toBeCloseTo(5);
  });
});

describe('computeMonthly', () => {
  it('groups by month and preserves chronological order', () => {
    const list = [
      mkIncident({ eiId: 'A', createdAt: '2025-10-06 12:00:00', countReceived: 1 }),
      mkIncident({ eiId: 'B', createdAt: '2026-01-20 12:00:00', countReceived: 1 }),
      mkIncident({ eiId: 'C', createdAt: '2025-11-10 12:00:00', countResolved: 1 }),
    ];
    const m = computeMonthly(list, 'month');
    expect(m.labels).toEqual(['Oct 2025', 'Nov 2025', 'Jan 2026']);
    expect(m.received).toEqual([1, 0, 1]);
    expect(m.resolved).toEqual([0, 1, 0]);
  });
});

describe('pivotByResolution', () => {
  it('rows follow resolution order, columns are sorted ISO weeks', () => {
    const list = [
      mkIncident({ eiId: 'A', resolutionBucket: '>72', createdAt: '2025-10-06' }),
      mkIncident({ eiId: 'B', resolutionBucket: '<4', createdAt: '2025-10-06' }),
      mkIncident({ eiId: 'C', resolutionBucket: '4-12', createdAt: '2025-12-29' }),
    ];
    const p = pivotByResolution(list);
    expect(p.rows).toEqual(['<4', '4-12', '>72']);
    expect(p.columns).toEqual(['2025 w41', '2026 w01']);
    expect(p.data['<4']['2025 w41'].count).toBe(1);
    expect(p.data['<4']['2025 w41'].percent).toBe(50);
    expect(p.data['4-12']['2026 w01'].count).toBe(1);
    expect(p.totals['2025 w41'].count).toBe(2);
  });
});

describe('pivotBySubstatus', () => {
  it('aggregates by substatus with russian locale sort', () => {
    const list = [
      mkIncident({ eiId: 'A', substatus: 'Корректировка', createdAt: '2025-10-06' }),
      mkIncident({ eiId: 'B', substatus: 'Авария', createdAt: '2025-10-06' }),
    ];
    const p = pivotBySubstatus(list);
    expect(p.rows[0].startsWith('А')).toBe(true);
    expect(p.rows[1].startsWith('К')).toBe(true);
  });
});
