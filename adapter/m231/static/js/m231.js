let allRows = [];
let filteredRows = [];
let activityChart = null;
let histogramChart = null;
let openDetailsTable = null;
let allDetailsTable = null;
const selects = {};
let suppressAutoApply = false;

const Core = window.M231Core;
const API_URL = "/reports/data231";
const RESOLVED_STATUSES = new Set(["Закрыт", "Решен"]);
const OPEN_STATUSES = new Set(["Назначен", "В работе", "Активное ожидание", "Зарегистрирован"]);

$(document).ready(async function () {
    Chart.register(ChartDataLabels);
    initFilters([]);
    bindFilterEvents();
    setFiltersStatus("Загрузка данных...", "");
    try {
        allRows = await loadRowsFromApi();
        if (!allRows.length) {
            throw new Error("API returned no rows");
        }
        initFilters(allRows);
        setFiltersAvailability(true);
        setFiltersStatus("Данные загружены", "is-success");
        applyFiltersAndRender();
    } catch (error) {
        console.error(error);
        setFiltersAvailability(false);
        setFiltersStatus("Данные недоступны", "is-error");
        filteredRows = [];
        renderAll();
        alert("Не удалось загрузить данные из API /reports/data231.");
    }
});

async function loadRowsFromApi() {
    const candidates = [
        `${API_URL}?status=&clientType=&ei=`,
        API_URL,
        `${API_URL}?status=`
    ];
    for (const url of candidates) {
        try {
            const response = await fetch(url, { headers: { Accept: "application/json" } });
            if (!response.ok) continue;
            const payload = await response.json();
            const rows = buildDataRowsFromApi(payload);
            if (rows.length) return rows;
        } catch (e) {
            void e;
        }
    }
    return [];
}

function toNumber(value) {
    const num = Number(String(value == null ? "" : value).replace(",", ".").trim());
    return Number.isFinite(num) ? num : 0;
}

function extractLink(raw) {
    const value = String(raw || "").trim();
    const match = value.match(/<a href="([^"]+)"target="_blank">([^<]+)<\/a>/i);
    if (!match) {
        return { id: value.replace(/<[^>]+>/g, "").trim(), href: "" };
    }
    const href = match[1].startsWith("https://remedy.msk.mts.ru/") ? match[1] : "";
    return { id: match[2].trim(), href };
}

function parseDate(value) {
    if (!value) return null;
    const text = String(value).replace(" ", "T");
    const d = new Date(text);
    return Number.isNaN(d.getTime()) ? null : d;
}

function buildDataRowsFromApi(payload) {
    const source = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
    return source.map((raw) => normalizeRawRecord(raw)).filter((item) => item.eiId);
}

function normalizeRawRecord(raw) {
    const ei = extractLink(raw["ЕИ"] || raw.ei || raw.EI || "");
    const mi = extractLink(raw["МИ"] || raw.mi || raw.MI || "");
    const registrationDate = raw["Дата регистрации"] || raw.dateTime || raw.createdAt || "";
    const resolutionDate = raw["Дата решения"] || raw.resolvedAt || "";
    const dateOnly = registrationDate ? String(registrationDate).slice(0, 10) : "";
    const duration = toNumber(raw["Длительность решения"] || raw["Длительноть решения"] || raw.duration);
    const resolvedCount = toNumber(raw["Кол-во решенных ЕИ"] || raw.resolvedCount);
    const openCount = toNumber(raw["Кол-во открытых ЕИ"] || raw.openCount);
    const status = raw["Статус"] || raw.status || "";
    return {
        dateTime: String(registrationDate || ""),
        dateOnly,
        dateObj: parseDate(registrationDate),
        resolvedObj: parseDate(resolutionDate),
        eiId: ei.id,
        eiHref: ei.href,
        miId: mi.id,
        miHref: mi.href,
        status: String(status),
        client: String(raw["Клиент"] || raw.client || ""),
        clientType: String(raw["Тип клиента"] || raw.clientType || ""),
        region: String(raw["Регион"] || raw.region || ""),
        subStatus: String(raw["Подстатус"] || raw.subStatus || ""),
        duration,
        slaBucket: Core.normalizeSlaBucket(raw["Срок решения"] || raw.slaBucket || ""),
        slaEi: String(raw["SLA ЕИ"] || raw.slaEi || ""),
        slaMi: String(raw["SLA МИ"] || raw.slaMi || ""),
        groupExec: String(raw["Гр. исполнителя"] || raw.groupExec || ""),
        groupControl: String(raw["Гр. контролирующего"] || raw.groupControl || ""),
        groupExecMi: String(raw["Гр. исполнителя МИ"] || raw.groupExecMi || ""),
        groupControlMi: String(raw["Гр. контролирующего МИ"] || raw.groupControlMi || ""),
        works: String(raw["Работы"] || raw.works || ""),
        solutionMi: String(raw["Решение МИ"] || raw.solutionMi || ""),
        description: String(raw["Бизнес-описание"] || raw["Описание"] || raw.description || ""),
        problems: toNumber(raw["Проблемы"] || raw.problems),
        incomingCount: 1,
        resolvedCount: resolvedCount === 1 || RESOLVED_STATUSES.has(String(status)) ? 1 : 0,
        openCount: openCount === 1 || OPEN_STATUSES.has(String(status)) ? 1 : 0
    };
}

function initTomSelect(id, values, defaultValues = []) {
    const existing = document.getElementById(id)?.tomselect;
    if (existing) existing.destroy();
    const control = new TomSelect(`#${id}`, {
        options: values.map((v) => ({ value: v, text: v })),
        valueField: "value",
        labelField: "text",
        searchField: "text",
        plugins: ["remove_button"],
        hideSelected: true,
        create: false,
        maxOptions: 5000,
        onChange: applyFiltersAndRender
    });
    control.setValue(defaultValues, true);
    return control;
}

function uniqueSorted(rows, field) {
    return [...new Set(rows.map((item) => item[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
}

function initFilters(rows) {
    suppressAutoApply = true;
    const minDate = rows.map((r) => r.dateOnly).filter(Boolean).sort()[0];
    const maxDate = rows.map((r) => r.dateOnly).filter(Boolean).sort().slice(-1)[0];
    $("#dateFromFilter").val(minDate || "");
    $("#dateToFilter").val(maxDate || "");
    const clientTypeValues = uniqueSorted(rows, "clientType");
    const defaultClientType = clientTypeValues.includes("Мобильный") ? ["Мобильный"] : [];
    selects.clientType = initTomSelect("clientTypeFilter", clientTypeValues, defaultClientType);
    selects.client = initTomSelect("clientFilter", uniqueSorted(rows, "client"));
    selects.status = initTomSelect("statusFilter", uniqueSorted(rows, "status"));
    selects.slaBucket = initTomSelect("slaBucketFilter", Core.SLA_BUCKETS.slice());
    selects.ei = initTomSelect("eiFilter", uniqueSorted(rows, "eiId"));
    selects.mi = initTomSelect("miFilter", uniqueSorted(rows, "miId"));
    suppressAutoApply = false;
}

function resetFilters() {
    if (!allRows.length) return;
    suppressAutoApply = true;
    Object.values(selects).forEach((control) => control.clear(true));
    if (selects.clientType?.options["Мобильный"]) {
        selects.clientType.setValue(["Мобильный"], true);
    }
    const minDate = allRows.map((r) => r.dateOnly).filter(Boolean).sort()[0];
    const maxDate = allRows.map((r) => r.dateOnly).filter(Boolean).sort().slice(-1)[0];
    $("#timeUnitFilter").val("month");
    $("#dateFromFilter").val(minDate || "");
    $("#dateToFilter").val(maxDate || "");
    suppressAutoApply = false;
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    if (suppressAutoApply) return;
    const selected = {
        clientType: new Set(selects.clientType.getValue()),
        client: new Set(selects.client.getValue()),
        status: new Set(selects.status.getValue()),
        slaBucket: new Set(selects.slaBucket.getValue()),
        ei: new Set(selects.ei.getValue()),
        mi: new Set(selects.mi.getValue())
    };
    const from = $("#dateFromFilter").val();
    const to = $("#dateToFilter").val();
    filteredRows = allRows.filter((row) => {
        if (from && row.dateOnly && row.dateOnly < from) return false;
        if (to && row.dateOnly && row.dateOnly > to) return false;
        if (selected.clientType.size && !selected.clientType.has(row.clientType)) return false;
        if (selected.client.size && !selected.client.has(row.client)) return false;
        if (selected.status.size && !selected.status.has(row.status)) return false;
        if (selected.slaBucket.size && !selected.slaBucket.has(row.slaBucket)) return false;
        if (selected.ei.size && !selected.ei.has(row.eiId)) return false;
        if (selected.mi.size && !selected.mi.has(row.miId)) return false;
        return true;
    });
    renderAll();
}

function bindFilterEvents() {
    $("#timeUnitFilter").on("change", applyFiltersAndRender);
    $("#dateFromFilter").on("change", applyFiltersAndRender);
    $("#dateToFilter").on("change", applyFiltersAndRender);
    $("#resetFiltersBtn").on("click", resetFilters);
}

function setFiltersAvailability(enabled) {
    $("#timeUnitFilter").prop("disabled", !enabled);
    $("#dateFromFilter").prop("disabled", !enabled);
    $("#dateToFilter").prop("disabled", !enabled);
    $("#resetFiltersBtn").prop("disabled", !enabled);
    Object.values(selects).forEach((control) => {
        if (!control) return;
        if (enabled) control.enable();
        else control.disable();
    });
}

function setFiltersStatus(text, stateClass) {
    const node = $("#filtersStatus");
    node.text(text || "");
    node.removeClass("is-success is-error");
    if (stateClass) node.addClass(stateClass);
}

function renderActivityChart(rows) {
    const unit = $("#timeUnitFilter").val();
    const periods = Core.aggregateByPeriod(rows, unit);
    const labels = periods.map((item) => item.label);
    const chartData = {
        recNoMi: periods.map((item) => item.recNoMi),
        recMi:   periods.map((item) => item.recMi),
        resNoMi: periods.map((item) => item.resNoMi),
        resMi:   periods.map((item) => item.resMi),
        avg:     periods.map((item) => item.durationCount ? Number((item.durationSum / item.durationCount).toFixed(1)) : 0)
    };
    if (activityChart) activityChart.destroy();
    const ctx = document.getElementById("activityChart").getContext("2d");
    activityChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { type: "bar",  label: "Поступившие: ЕИ без МИ", data: chartData.recNoMi, backgroundColor: "#bae0ff", stack: "received", borderRadius: 4, order: 2 },
                { type: "bar",  label: "Поступившие: ЕИ с МИ",   data: chartData.recMi,   backgroundColor: "#1677ff", stack: "received", borderRadius: 4, order: 2 },
                { type: "bar",  label: "Решённые: ЕИ без МИ",    data: chartData.resNoMi, backgroundColor: "#ffd591", stack: "resolved", borderRadius: 4, order: 2 },
                { type: "bar",  label: "Решённые: ЕИ с МИ",      data: chartData.resMi,   backgroundColor: "#fa8c16", stack: "resolved", borderRadius: 4, order: 2 },
                { type: "line", label: "Ср. длительность решения", data: chartData.avg, yAxisID: "y1", borderColor: "#f5222d", backgroundColor: "#f5222d", tension: 0.35, pointRadius: 3, borderWidth: 2.5, order: 1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 16 } },
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { position: "top" },
                datalabels: {
                    display: (c) => {
                        const ds = c.dataset;
                        if (ds.type === "line") return ds.label === "Ср. длительность решения";
                        const v = ds.data[c.dataIndex];
                        return Number.isFinite(v) && v > 0;
                    },
                    clamp: true,
                    clip: false,
                    anchor: (c) => (c.dataset.type === "line" ? "end" : "center"),
                    align:  (c) => (c.dataset.type === "line" ? "top"  : "center"),
                    offset: 2,
                    color: "#1f1f1f",
                    font: { size: 10, weight: "600" },
                    formatter: (value, c) => {
                        if (!Number.isFinite(value) || value === 0) return "";
                        if (c.dataset.label === "Ср. длительность решения") return value.toFixed(1);
                        return value;
                    }
                }
            },
            scales: {
                y:  { stacked: true, beginAtZero: true, title: { display: true, text: "шт." }, grace: "8%" },
                y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Ср. длительность, ч" }, grace: "15%" },
                x:  { stacked: true }
            }
        }
    });
}

function renderResolutionHistogram(rows) {
    const hist = Core.resolutionHistogram(rows);
    $("#kpiOpenBox").text(hist.openTotal);
    $("#kpiOpenMi").text(hist.openMiTotal);
    if (histogramChart) histogramChart.destroy();
    const ctx = document.getElementById("resolutionHistogram").getContext("2d");
    histogramChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: hist.labels.slice(),
            datasets: [
                { label: "ЕИ без МИ", data: hist.openWithoutMi, backgroundColor: "#95de64", stack: "open", borderRadius: 4 },
                { label: "ЕИ с МИ",   data: hist.openWithMi,    backgroundColor: "#237804", stack: "open", borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 16 } },
            plugins: {
                legend: { position: "top" },
                datalabels: {
                    display: (c) => Number.isFinite(c.dataset.data[c.dataIndex]) && c.dataset.data[c.dataIndex] > 0,
                    anchor: "center",
                    align: "center",
                    color: "#1f1f1f",
                    font: { size: 11, weight: "600" }
                }
            },
            scales: {
                y: { stacked: true, beginAtZero: true, title: { display: true, text: "шт." } },
                x: { stacked: true, title: { display: true, text: "срок решения" } }
            }
        }
    });
}

function buildSummaryTable(containerId, periods, rowLabels, extractor) {
    const columns = periods.map((p) => p.key);
    let html = '<table class="table table-bordered table-sm summary-table"><thead><tr><th>Показатель</th>';
    periods.forEach((p) => { html += `<th colspan="2">${escapeHtml(p.label)}</th>`; });
    html += "<th colspan=\"2\">Общий итог</th></tr><tr><th></th>";
    periods.forEach(() => { html += "<th>ЕИ+</th><th>%</th>"; });
    html += "<th>ЕИ+</th><th>%</th></tr></thead><tbody>";
    const totalPerPeriod = Object.fromEntries(columns.map((c) => [c, 0]));
    const valuesByLabel = {};
    rowLabels.forEach((label) => {
        valuesByLabel[label] = extractor(label);
        columns.forEach((periodKey) => {
            totalPerPeriod[periodKey] += valuesByLabel[label][periodKey] || 0;
        });
    });
    const grandTotal = Object.values(totalPerPeriod).reduce((sum, v) => sum + v, 0);
    rowLabels.forEach((label) => {
        html += `<tr><td>${escapeHtml(label)}</td>`;
        let rowTotal = 0;
        columns.forEach((periodKey) => {
            const count = valuesByLabel[label][periodKey] || 0;
            rowTotal += count;
            const denominator = totalPerPeriod[periodKey] || 0;
            const percent = denominator ? ((count / denominator) * 100).toFixed(2) : "0.00";
            html += `<td>${count || ""}</td><td>${percent}</td>`;
        });
        const totalPercent = grandTotal ? ((rowTotal / grandTotal) * 100).toFixed(2) : "0.00";
        html += `<td>${rowTotal || ""}</td><td>${totalPercent}</td></tr>`;
    });
    html += '<tr class="total-row"><td>Общий итог</td>';
    columns.forEach((periodKey) => {
        html += `<td>${totalPerPeriod[periodKey] || ""}</td><td>100</td>`;
    });
    html += `<td>${grandTotal || ""}</td><td>100</td></tr></tbody></table>`;
    const wrap = document.getElementById(containerId);
    wrap.innerHTML = html;
    wrap.scrollLeft = wrap.scrollWidth;
}

function renderSubstatusTable(rows) {
    const unit = $("#timeUnitFilter").val();
    const periods = Core.aggregateByPeriod(rows, unit);
    const labels = [...new Set(rows.map((r) => r.subStatus).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
    buildSummaryTable("substatusTableWrap", periods, labels, (label) => {
        const counts = {};
        periods.forEach((p) => { counts[p.key] = 0; });
        rows.forEach((r) => {
            if (r.subStatus !== label) return;
            const p = Core.getPeriodInfo(r.dateObj, unit);
            counts[p.key] = (counts[p.key] || 0) + 1;
        });
        return counts;
    });
}

function renderSlaBucketTable(rows) {
    const unit = $("#timeUnitFilter").val();
    const periods = Core.aggregateByPeriod(rows, unit);
    buildSummaryTable("slaBucketTableWrap", periods, Core.SLA_BUCKETS.slice(), (label) => {
        const counts = {};
        periods.forEach((p) => { counts[p.key] = 0; });
        rows.forEach((r) => {
            const bucket = Core.normalizeSlaBucket(r.slaBucket);
            if (bucket !== label) return;
            const p = Core.getPeriodInfo(r.dateObj, unit);
            counts[p.key] = (counts[p.key] || 0) + 1;
        });
        return counts;
    });
}

function linkHtml(id, href) {
    if (!id) return "";
    if (!href) return escapeHtml(id);
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(id)}</a>`;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function tableData(rows) {
    return rows.map((r) => ({
        dateTime: r.dateTime,
        ei: linkHtml(r.eiId, r.eiHref),
        status: escapeHtml(r.status),
        client: escapeHtml(r.client),
        region: escapeHtml(r.region),
        duration: r.duration ? Number(r.duration.toFixed(2)) : "",
        slaBucket: escapeHtml(r.slaBucket),
        groupExec: escapeHtml(r.groupExec),
        groupControl: escapeHtml(r.groupControl),
        mi: linkHtml(r.miId, r.miHref),
        slaEi: escapeHtml(r.slaEi),
        slaMi: escapeHtml(r.slaMi),
        groupExecMi: escapeHtml(r.groupExecMi),
        groupControlMi: escapeHtml(r.groupControlMi),
        description: escapeHtml(r.description),
        solutionMi: escapeHtml(r.solutionMi)
    }));
}

function buildDetailsTable(instanceRef, tableId, rows) {
    const data = tableData(rows);
    if (instanceRef) {
        instanceRef.destroy();
        $(`#${tableId}`).empty();
    }
    return $(`#${tableId}`).DataTable({
        data,
        columns: [
            { title: "Дата регистрации", data: "dateTime" },
            { title: "ЕИ", data: "ei" },
            { title: "Статус", data: "status" },
            { title: "Клиент", data: "client" },
            { title: "Регион", data: "region" },
            { title: "Длительность решения", data: "duration" },
            { title: "Срок решения", data: "slaBucket" },
            { title: "Гр. исполнителя", data: "groupExec" },
            { title: "Гр. контролирующего", data: "groupControl" },
            { title: "МИ", data: "mi" },
            { title: "SLA ЕИ", data: "slaEi" },
            { title: "SLA МИ", data: "slaMi" },
            { title: "Гр. исполнителя МИ", data: "groupExecMi" },
            { title: "Гр. контролирующего МИ", data: "groupControlMi" },
            { title: "Описание", data: "description" },
            { title: "Решение МИ", data: "solutionMi" }
        ],
        order: [[0, "desc"]],
        paging: false,
        info: true,
        searching: true,
        autoWidth: false,
        scrollX: true,
        scrollY: "380px",
        language: {
            info: "Записи с _START_ до _END_ из _TOTAL_ записей",
            infoEmpty: "Записи отсутствуют",
            zeroRecords: "Ничего не найдено",
            search: "Поиск:",
            emptyTable: "Нет данных"
        },
        columnDefs: [{ targets: [1, 9], orderable: false }],
        createdRow: (row) => { $(row).find("td").css("vertical-align", "top"); }
    });
}

function updateKpi(rows) {
    const total = rows.length;
    const resolved = rows.reduce((sum, r) => sum + r.resolvedCount, 0);
    const open = rows.reduce((sum, r) => sum + r.openCount, 0);
    const avg = total ? (rows.reduce((sum, r) => sum + r.duration, 0) / total) : 0;
    $("#kpiTotal").text(total);
    $("#kpiResolved").text(resolved);
    $("#kpiOpen").text(open);
    $("#kpiAvgDuration").text(avg.toFixed(2));
}

function renderAll() {
    updateKpi(filteredRows);
    renderActivityChart(filteredRows);
    renderResolutionHistogram(filteredRows);
    renderSubstatusTable(filteredRows);
    renderSlaBucketTable(filteredRows);
    const openRows = filteredRows.filter((row) => row.openCount === 1);
    openDetailsTable = buildDetailsTable(openDetailsTable, "openDetailsTable", openRows);
    allDetailsTable = buildDetailsTable(allDetailsTable, "allDetailsTable", filteredRows);
}
