import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../../../frontend/public/data.json');
const dest = resolve(here, 'data231.mock.json');

const ds = JSON.parse(readFileSync(src, 'utf8'));

function linkEi(id) {
    return `<a href="https://remedy.msk.mts.ru/arsys/servlet/ViewFormServlet?form=I2%3ASingleIncidents&server=remedy-prom&eid=${id}"target="_blank">${id}</a>`;
}
function linkMi(id) {
    if (!id) return '';
    return `<a href="https://remedy.msk.mts.ru/arsys/servlet/ViewFormServlet?form=I2%3AIncidents&server=remedy-prom&eid=${id}"target="_blank">${id}</a>`;
}
function fmt(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const rows = ds.incidents.map((i) => {
    const created = i.createdAt ? new Date(i.createdAt) : null;
    const resolved = (created && typeof i.resolutionHours === 'number' && i.countResolved)
        ? new Date(created.getTime() + i.resolutionHours * 3600 * 1000)
        : null;
    return {
        'ЕИ': linkEi(i.eiId),
        'Дата регистрации': fmt(i.createdAt),
        'Дата решения': resolved ? fmt(resolved.toISOString()) : '',
        'Кол-во поступивших ЕИ': 1,
        'Кол-во решенных ЕИ': i.countResolved,
        'Кол-во открытых ЕИ': i.countOpen,
        'МИ': linkMi(i.miId),
        'Работы': i.workId || '',
        'Длительность решения': i.resolutionHours,
        'Подстатус': i.substatus || '',
        'Статус': i.status || '',
        'Клиент': i.client || '',
        'Регион': i.region || '',
        'Гр. контролирующего': i.groupController || '',
        'Гр. исполнителя': i.groupExecutor || '',
        'Гр. контролирующего МИ': i.groupControllerMi || '',
        'Гр. исполнителя МИ': i.groupExecutorMi || '',
        'ГодНед': i.weekStart || '',
        'Срок решения': i.resolutionBucket || '',
        'SLA ЕИ': i.slaEi || '',
        'SLA МИ': i.slaMi || '',
        'Решение МИ': i.solutionMi || '',
        'Описание': i.shortDescription || '',
        'Бизнес-описание': i.businessDescription || '',
        'Открыт': i.isOpen ? 1 : 0,
        'Тип клиента': i.clientType || '',
        '№ Контракта из Зибель': i.siebelContract || '',
        'md': i.modifiedAt || 0,
        'Проблемы': i.problemsCount || 0
    };
});

writeFileSync(dest, JSON.stringify(rows, null, 2), 'utf8');
console.log(`wrote ${rows.length} rows to ${dest}`);
