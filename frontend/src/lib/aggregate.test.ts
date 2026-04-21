import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  computeActivity,
  computeKpi,
  computeMonthly,
  computeResolutionHistogram,
  hourBucket,
  pivotByResolution,
  pivotBySubstatus,
  resolvedDateOf,
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

describe('resolvedDateOf', () => {
  it('returns null when ticket is not resolved', () => {
    const i = mkIncident({ countResolved: 0, resolutionHours: 5 });
    expect(resolvedDateOf(i)).toBeNull();
  });
  it('adds resolutionHours to createdAt', () => {
    const i = mkIncident({
      createdAt: '2026-01-01 10:00:00',
      countResolved: 1,
      resolutionHours: 8,
    });
    const out = resolvedDateOf(i);
    expect(out).not.toBeNull();
    const deltaMs = new Date(out as string).getTime() - new Date('2026-01-01 10:00:00').getTime();
    expect(deltaMs).toBe(8 * 3600 * 1000);
  });
});

describe('hourBucket', () => {
  it('classifies boundary values into the 6-bucket scale', () => {
    expect(hourBucket(0)).toBe('4ч');
    expect(hourBucket(3.9)).toBe('4ч');
    expect(hourBucket(4)).toBe('12ч');
    expect(hourBucket(11.9)).toBe('12ч');
    expect(hourBucket(12)).toBe('24ч');
    expect(hourBucket(23.9)).toBe('24ч');
    expect(hourBucket(24)).toBe('48ч');
    expect(hourBucket(47.9)).toBe('48ч');
    expect(hourBucket(48)).toBe('72ч');
    expect(hourBucket(71.9)).toBe('72ч');
    expect(hourBucket(72)).toBe('>72ч');
    expect(hourBucket(500)).toBe('>72ч');
    expect(hourBucket(null)).toBeNull();
  });
});

describe('computeActivity', () => {
  it('splits received/resolved stacks by MI presence and averages hours for resolved only', () => {
    const list = [
      mkIncident({
        eiId: 'A',
        createdAt: '2026-01-05 10:00:00',
        countReceived: 1,
        miId: 'MI1',
      }),
      mkIncident({
        eiId: 'B',
        createdAt: '2026-01-06 10:00:00',
        countReceived: 1,
        miId: null,
      }),
      mkIncident({
        eiId: 'C',
        createdAt: '2026-01-01 10:00:00',
        countResolved: 1,
        resolutionHours: 10,
        miId: 'MI2',
      }),
      mkIncident({
        eiId: 'D',
        createdAt: '2026-01-02 10:00:00',
        countResolved: 1,
        resolutionHours: 20,
        miId: null,
      }),
    ];
    const a = computeActivity(list, 'month');
    expect(a.labels).toEqual(['Jan 2026']);
    expect(a.receivedWithMi).toEqual([1]);
    expect(a.receivedWithoutMi).toEqual([1]);
    expect(a.resolvedWithMi).toEqual([1]);
    expect(a.resolvedWithoutMi).toEqual([1]);
    expect(a.avgResolution[0]).toBeCloseTo(15);
  });
  it('uses resolvedAt = createdAt + resolutionHours for resolved-bar attribution', () => {
    const list = [
      mkIncident({
        eiId: 'A',
        createdAt: '2026-01-28 10:00:00',
        countResolved: 1,
        resolutionHours: 96,
        miId: null,
      }),
    ];
    const a = computeActivity(list, 'month');
    expect(a.labels).toEqual(['Feb 2026']);
    expect(a.resolvedWithoutMi).toEqual([1]);
    expect(a.receivedWithoutMi).toEqual([0]);
  });
});

describe('computeResolutionHistogram', () => {
  it('counts only open EI split by MI across 6 hour buckets', () => {
    const list = [
      mkIncident({ eiId: 'A', countOpen: 1, resolutionHours: 3, miId: null }),
      mkIncident({ eiId: 'B', countOpen: 1, resolutionHours: 6, miId: 'MI1' }),
      mkIncident({ eiId: 'C', countOpen: 1, resolutionHours: 50, miId: 'MI2' }),
      mkIncident({ eiId: 'D', countOpen: 1, resolutionHours: 200, miId: null }),
      mkIncident({ eiId: 'E', countOpen: 0, countResolved: 1, resolutionHours: 5 }),
    ];
    const h = computeResolutionHistogram(list);
    expect(h.openTotal).toBe(4);
    expect(h.openMiTotal).toBe(2);
    expect(h.labels).toEqual(['4ч', '12ч', '24ч', '48ч', '72ч', '>72ч']);
    expect(h.openWithoutMi).toEqual([1, 0, 0, 0, 0, 1]);
    expect(h.openWithMi).toEqual([0, 1, 0, 0, 1, 0]);
  });
});
