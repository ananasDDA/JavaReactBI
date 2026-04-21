(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.M231Core = factory();
    }
})(typeof window !== 'undefined' ? window : globalThis, function () {

    const SLA_BUCKETS = ['<4', '4-12', '12-24', '24-72', '>72'];
    const HOUR_BUCKET_LABELS = ['4ч', '12ч', '24ч', '48ч', '72ч', '>72ч'];

    function normalizeSlaBucket(value) {
        const raw = String(value || '').replace(/\s+/g, '');
        if (raw.includes('<4')) return '<4';
        if (raw.includes('4-12')) return '4-12';
        if (raw.includes('12-24')) return '12-24';
        if (raw.includes('24-72')) return '24-72';
        if (raw.includes('>72')) return '>72';
        return 'Не определено';
    }

    function hourBucket(hours) {
        if (typeof hours !== 'number' || !Number.isFinite(hours)) return null;
        if (hours < 4) return '4ч';
        if (hours < 12) return '12ч';
        if (hours < 24) return '24ч';
        if (hours < 48) return '48ч';
        if (hours < 72) return '72ч';
        return '>72ч';
    }

    function toIsoWeekParts(dateObj) {
        const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week };
    }

    function toIsoYearWeek(dateObj) {
        if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
        const p = toIsoWeekParts(dateObj);
        return `${p.year} w${String(p.week).padStart(2, '0')}`;
    }

    function getPeriodInfo(dateObj, unit) {
        if (!dateObj || Number.isNaN(dateObj.getTime())) {
            return { key: 'Без даты', label: 'Без даты', sortValue: Number.MAX_SAFE_INTEGER };
        }
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth() + 1;
        if (unit === 'year') {
            return { key: String(year), label: String(year), sortValue: year * 10000 + 101 };
        }
        if (unit === 'halfyear') {
            const h = month <= 6 ? 1 : 2;
            const sortMonth = h === 1 ? 1 : 7;
            return { key: `${year}-H${h}`, label: `${year} H${h}`, sortValue: year * 10000 + sortMonth * 100 };
        }
        if (unit === 'quarter') {
            const q = Math.floor((month - 1) / 3) + 1;
            const sortMonth = (q - 1) * 3 + 1;
            return { key: `${year}-Q${q}`, label: `${year} Q${q}`, sortValue: year * 10000 + sortMonth * 100 };
        }
        if (unit === 'month') {
            const key = `${year}-${String(month).padStart(2, '0')}`;
            return { key, label: key, sortValue: year * 10000 + month * 100 };
        }
        if (unit === 'week') {
            const { year: iy, week } = toIsoWeekParts(dateObj);
            const label = `${iy} w${String(week).padStart(2, '0')}`;
            return { key: label, label, sortValue: iy * 100 + week };
        }
        const d = dateObj.getDate();
        const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        return { key, label: key, sortValue: year * 10000 + month * 100 + d };
    }

    function aggregateByPeriod(rows, unit) {
        const map = new Map();
        const ensure = (p) => {
            let entry = map.get(p.key);
            if (!entry) {
                entry = {
                    key: p.key,
                    label: p.label,
                    sortValue: p.sortValue,
                    recMi: 0,
                    recNoMi: 0,
                    resMi: 0,
                    resNoMi: 0,
                    durationSum: 0,
                    durationCount: 0
                };
                map.set(p.key, entry);
            }
            return entry;
        };
        rows.forEach((row) => {
            if (row.incomingCount === 1) {
                const p = getPeriodInfo(row.dateObj, unit);
                const e = ensure(p);
                if (row.miId) e.recMi += 1; else e.recNoMi += 1;
            }
            if (row.resolvedCount === 1) {
                const source = row.resolvedObj || row.dateObj;
                const p = getPeriodInfo(source, unit);
                const e = ensure(p);
                if (row.miId) e.resMi += 1; else e.resNoMi += 1;
                if (typeof row.duration === 'number' && row.duration > 0) {
                    e.durationSum += row.duration;
                    e.durationCount += 1;
                }
            }
        });
        return [...map.values()].sort((a, b) => a.sortValue - b.sortValue);
    }

    function resolutionHistogram(rows) {
        const mi = new Array(HOUR_BUCKET_LABELS.length).fill(0);
        const noMi = new Array(HOUR_BUCKET_LABELS.length).fill(0);
        let total = 0;
        let miTotal = 0;
        rows.forEach((r) => {
            if (r.openCount !== 1) return;
            total += 1;
            const b = hourBucket(r.duration);
            if (!b) return;
            const idx = HOUR_BUCKET_LABELS.indexOf(b);
            if (idx < 0) return;
            if (r.miId) { mi[idx] += 1; miTotal += 1; } else { noMi[idx] += 1; }
        });
        return {
            labels: HOUR_BUCKET_LABELS,
            openWithMi: mi,
            openWithoutMi: noMi,
            openTotal: total,
            openMiTotal: miTotal
        };
    }

    return {
        SLA_BUCKETS,
        HOUR_BUCKET_LABELS,
        normalizeSlaBucket,
        hourBucket,
        toIsoWeekParts,
        toIsoYearWeek,
        getPeriodInfo,
        aggregateByPeriod,
        resolutionHistogram
    };
});
