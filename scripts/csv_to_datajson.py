from __future__ import annotations

import csv
import html
import json
import re
from collections import Counter
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "source_query.csv"
DST = ROOT / "frontend" / "public" / "data.json"

HREF_RE = re.compile(r'<a[^>]*?eid=([A-Z0-9]+)[^>]*>', re.IGNORECASE)


def extract_id(raw):
    if not raw:
        return None
    m = HREF_RE.search(raw)
    if m:
        return m.group(1)
    stripped = re.sub(r"<[^>]+>", "", raw).strip()
    return stripped or None


def num(row, name):
    v = row.get(name, "")
    try:
        return int(float(v)) if v not in (None, "") else 0
    except (TypeError, ValueError):
        return 0


def fnum(row, name):
    v = row.get(name, "")
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def iso_year_week(day_str):
    if not day_str:
        return None
    try:
        d = date.fromisoformat(day_str[:10])
    except ValueError:
        return None
    year, week, _ = d.isocalendar()
    return f"{year:04d} w{week:02d}"


def map_row(row):
    created = row.get("Дата регистрации") or None
    week_start = row.get("ГодНед") or None
    return {
        "eiId": extract_id(row.get("ЕИ", "")) or "",
        "createdAt": created,
        "countReceived": num(row, "Кол-во поступивших ЕИ"),
        "countResolved": num(row, "Кол-во решенных ЕИ"),
        "countOpen": num(row, "Кол-во открытых ЕИ"),
        "miId": extract_id(row.get("МИ", "")),
        "workId": row.get("Работы") or None,
        "resolutionHours": fnum(row, "Длительноть решения"),
        "substatus": row.get("Подстатус") or None,
        "status": row.get("Статус") or None,
        "client": (row.get("Клиент") or "").strip('"') or None,
        "region": row.get("Регион") or None,
        "groupController": row.get("Гр. контролирующего") or None,
        "groupExecutor": row.get("Гр. исполнителя") or None,
        "groupControllerMi": row.get("Гр. контролирующего МИ") or None,
        "groupExecutorMi": row.get("Гр. исполнителя МИ") or None,
        "weekStart": week_start,
        "yearWeek": iso_year_week(created),
        "resolutionBucket": row.get("Срок решения") or None,
        "slaEi": row.get("SLA ЕИ") or None,
        "slaMi": row.get("SLA МИ") or None,
        "solutionMi": html.unescape(row.get("Решение МИ") or "") or None,
        "shortDescription": html.unescape(row.get("Описание") or "") or None,
        "businessDescription": html.unescape(row.get("Бизнес-описание") or "") or None,
        "isOpen": bool(num(row, "Открыт")),
        "clientType": row.get("Тип клиента") or None,
        "siebelContract": row.get("№ Контракта из Зибель") or None,
        "modifiedAt": int(float(row.get("md") or 0)) if row.get("md") else None,
        "problemsCount": num(row, "Проблемы"),
    }


def build_meta(records):
    def uniq(key):
        return sorted({r[key] for r in records if r.get(key)})

    return {
        "remedyEiUrl": "https://remedy.msk.mts.ru/arsys/servlet/ViewFormServlet?form=I2%3ASingleIncidents&server=remedy-prom&eid={id}",
        "remedyMiUrl": "https://remedy.msk.mts.ru/arsys/servlet/ViewFormServlet?form=I2%3AIncidents&server=remedy-prom&eid={id}",
        "resolutionOrder": ["<4", "4-12", "12-24", "24-72", ">72", "Не определено"],
        "statuses": uniq("status"),
        "substatuses": uniq("substatus"),
        "clients": uniq("client"),
        "regions": uniq("region"),
        "clientTypes": uniq("clientType"),
        "controllerGroups": uniq("groupController"),
        "executorGroups": uniq("groupExecutor"),
        "yearWeeks": dict(sorted(Counter(r["yearWeek"] for r in records if r.get("yearWeek")).items())),
    }


def main():
    with SRC.open(encoding="utf-8") as f:
        reader = csv.DictReader(f, quotechar="^")
        records = [map_row(r) for r in reader]

    payload = {
        "generatedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "count": len(records),
        "source": "csv-bake",
        "incidents": records,
        "meta": build_meta(records),
    }

    DST.parent.mkdir(parents=True, exist_ok=True)
    with DST.open("w", encoding="utf-8") as out:
        json.dump(payload, out, ensure_ascii=False, indent=2)
    print(f"wrote {DST} ({len(records)} rows)")


if __name__ == "__main__":
    main()
