import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Core = require('../static/js/m231-core.js');

test('normalizeSlaBucket maps все варианты, мусор → "Не определено"', () => {
    assert.equal(Core.normalizeSlaBucket('<4'), '<4');
    assert.equal(Core.normalizeSlaBucket('4-12'), '4-12');
    assert.equal(Core.normalizeSlaBucket('12-24'), '12-24');
    assert.equal(Core.normalizeSlaBucket('24-72'), '24-72');
    assert.equal(Core.normalizeSlaBucket('>72'), '>72');
    assert.equal(Core.normalizeSlaBucket(''), 'Не определено');
    assert.equal(Core.normalizeSlaBucket(null), 'Не определено');
    assert.equal(Core.normalizeSlaBucket('что-то'), 'Не определено');
});

test('hourBucket корректно ставит границы 4/12/24/48/72', () => {
    assert.equal(Core.hourBucket(0), '4ч');
    assert.equal(Core.hourBucket(3.99), '4ч');
    assert.equal(Core.hourBucket(4), '12ч');
    assert.equal(Core.hourBucket(11.99), '12ч');
    assert.equal(Core.hourBucket(12), '24ч');
    assert.equal(Core.hourBucket(23.99), '24ч');
    assert.equal(Core.hourBucket(24), '48ч');
    assert.equal(Core.hourBucket(47.99), '48ч');
    assert.equal(Core.hourBucket(48), '72ч');
    assert.equal(Core.hourBucket(71.99), '72ч');
    assert.equal(Core.hourBucket(72), '>72ч');
    assert.equal(Core.hourBucket(500), '>72ч');
    assert.equal(Core.hourBucket(null), null);
    assert.equal(Core.hourBucket(Number.NaN), null);
});

test('toIsoYearWeek форматирует YYYY wWW с паддингом и учётом ISO-года', () => {
    assert.equal(Core.toIsoYearWeek(new Date('2026-01-05T12:00:00')), '2026 w02');
    assert.equal(Core.toIsoYearWeek(new Date('2025-12-29T12:00:00')), '2026 w01');
    assert.equal(Core.toIsoYearWeek(new Date('2024-12-30T12:00:00')), '2025 w01');
    assert.equal(Core.toIsoYearWeek(new Date('2025-01-01T12:00:00')), '2025 w01');
    assert.equal(Core.toIsoYearWeek(new Date('invalid')), null);
});

test('getPeriodInfo различает day/week/month/quarter/halfyear/year + "Без даты"', () => {
    const d = new Date('2026-02-18T10:00:00');
    assert.equal(Core.getPeriodInfo(d, 'year').label, '2026');
    assert.equal(Core.getPeriodInfo(d, 'halfyear').label, '2026 H1');
    assert.equal(Core.getPeriodInfo(d, 'quarter').label, '2026 Q1');
    assert.equal(Core.getPeriodInfo(d, 'month').label, '2026-02');
    assert.match(Core.getPeriodInfo(d, 'week').label, /^2026 w\d{2}$/);
    assert.equal(Core.getPeriodInfo(d, 'day').label, '2026-02-18');
    assert.equal(Core.getPeriodInfo(null, 'month').key, 'Без даты');
});

test('aggregateByPeriod разводит received/resolved по дате + стек с МИ/без МИ', () => {
    const rows = [
        { incomingCount: 1, resolvedCount: 0, openCount: 0, dateObj: new Date('2026-01-05T10:00:00'), miId: 'MI1', duration: 0 },
        { incomingCount: 1, resolvedCount: 0, openCount: 0, dateObj: new Date('2026-01-06T10:00:00'), miId: '',    duration: 0 },
        { incomingCount: 0, resolvedCount: 1, openCount: 0, dateObj: new Date('2026-01-01T10:00:00'), resolvedObj: new Date('2026-01-03T10:00:00'), miId: 'MI2', duration: 10 },
        { incomingCount: 0, resolvedCount: 1, openCount: 0, dateObj: new Date('2026-01-02T10:00:00'), resolvedObj: new Date('2026-01-04T10:00:00'), miId: '',    duration: 20 }
    ];
    const agg = Core.aggregateByPeriod(rows, 'month');
    assert.equal(agg.length, 1);
    assert.equal(agg[0].recMi, 1);
    assert.equal(agg[0].recNoMi, 1);
    assert.equal(agg[0].resMi, 1);
    assert.equal(agg[0].resNoMi, 1);
    assert.equal(agg[0].durationSum / agg[0].durationCount, 15);
});

test('aggregateByPeriod использует resolvedObj (решение может уехать в следующий месяц)', () => {
    const rows = [
        { incomingCount: 0, resolvedCount: 1, openCount: 0,
          dateObj: new Date('2026-01-28T10:00:00'),
          resolvedObj: new Date('2026-02-01T10:00:00'),
          miId: '', duration: 96 }
    ];
    const agg = Core.aggregateByPeriod(rows, 'month');
    assert.deepEqual(agg.map((e) => e.label), ['2026-02']);
    assert.equal(agg[0].resNoMi, 1);
});

test('resolutionHistogram считает только открытые, split по МИ, 6 бакетов', () => {
    const rows = [
        { openCount: 1, resolvedCount: 0, duration: 3,   miId: '' },
        { openCount: 1, resolvedCount: 0, duration: 6,   miId: 'MI1' },
        { openCount: 1, resolvedCount: 0, duration: 50,  miId: 'MI2' },
        { openCount: 1, resolvedCount: 0, duration: 200, miId: '' },
        { openCount: 0, resolvedCount: 1, duration: 5,   miId: '' }
    ];
    const h = Core.resolutionHistogram(rows);
    assert.equal(h.openTotal, 4);
    assert.equal(h.openMiTotal, 2);
    assert.deepEqual(h.labels, ['4ч', '12ч', '24ч', '48ч', '72ч', '>72ч']);
    assert.deepEqual(h.openWithoutMi, [1, 0, 0, 0, 0, 1]);
    assert.deepEqual(h.openWithMi,    [0, 1, 0, 0, 1, 0]);
});
