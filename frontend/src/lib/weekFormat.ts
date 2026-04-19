import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export function toIsoYearWeek(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = dayjs(value);
  if (!d.isValid()) return null;
  const year = d.isoWeekYear();
  const week = d.isoWeek();
  return `${year} w${String(week).padStart(2, '0')}`;
}

export function yearWeekKey(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const d = dayjs(value);
  if (!d.isValid()) return null;
  return d.isoWeekYear() * 100 + d.isoWeek();
}

export function parseYearWeekLabel(label: string): number {
  const m = label.match(/^(\d{4})\s*w(\d{2})$/i);
  if (!m) return 0;
  return parseInt(m[1], 10) * 100 + parseInt(m[2], 10);
}

export function compareYearWeek(a: string, b: string): number {
  return parseYearWeekLabel(a) - parseYearWeekLabel(b);
}
