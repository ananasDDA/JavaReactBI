import { describe, expect, it } from 'vitest';
import { compareYearWeek, parseYearWeekLabel, toIsoYearWeek, yearWeekKey } from './weekFormat';

describe('toIsoYearWeek', () => {
  it('returns YYYY wWW with zero padding', () => {
    expect(toIsoYearWeek('2025-02-24')).toBe('2025 w09');
  });
  it('handles last ISO week of the year that belongs to next ISO year', () => {
    expect(toIsoYearWeek('2025-12-29')).toBe('2026 w01');
  });
  it('returns null for null and invalid dates', () => {
    expect(toIsoYearWeek(null)).toBeNull();
    expect(toIsoYearWeek(undefined)).toBeNull();
    expect(toIsoYearWeek('not-a-date')).toBeNull();
  });
});

describe('yearWeekKey / parseYearWeekLabel', () => {
  it('produces monotonic order', () => {
    const a = yearWeekKey('2025-12-29')!;
    const b = yearWeekKey('2026-01-12')!;
    const c = yearWeekKey('2026-03-02')!;
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
  it('parseYearWeekLabel inverse of format', () => {
    expect(parseYearWeekLabel('2026 w01')).toBe(202601);
    expect(parseYearWeekLabel('2025 w09')).toBe(202509);
  });
  it('compareYearWeek sorts ascending', () => {
    const labels = ['2026 w01', '2025 w09', '2025 w52', '2026 w16'];
    const sorted = [...labels].sort(compareYearWeek);
    expect(sorted).toEqual(['2025 w09', '2025 w52', '2026 w01', '2026 w16']);
  });
});
