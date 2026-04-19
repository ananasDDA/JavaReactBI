from __future__ import annotations

import csv
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "source_query.csv"
DST = ROOT / "docker" / "seed.sql"

COLUMNS = [
    ("ei_id",               "VARCHAR(32)"),
    ("created_at",          "DATETIME NULL"),
    ("count_received",      "TINYINT NOT NULL DEFAULT 0"),
    ("count_resolved",      "TINYINT NOT NULL DEFAULT 0"),
    ("count_open",          "TINYINT NOT NULL DEFAULT 0"),
    ("mi_id",               "VARCHAR(32) NULL"),
    ("work_id",             "VARCHAR(32) NULL"),
    ("resolution_hours",    "DOUBLE NULL"),
    ("substatus",           "VARCHAR(128) NULL"),
    ("status",              "VARCHAR(64) NULL"),
    ("client",              "VARCHAR(255) NULL"),
    ("region",              "VARCHAR(128) NULL"),
    ("group_controller",    "VARCHAR(255) NULL"),
    ("group_executor",      "VARCHAR(255) NULL"),
    ("group_controller_mi", "VARCHAR(255) NULL"),
    ("group_executor_mi",   "VARCHAR(255) NULL"),
    ("week_start",          "DATE NULL"),
    ("resolution_bucket",   "VARCHAR(16) NULL"),
    ("sla_ei",              "VARCHAR(32) NULL"),
    ("sla_mi",              "VARCHAR(32) NULL"),
    ("solution_mi",         "TEXT NULL"),
    ("short_description",   "TEXT NULL"),
    ("business_description","MEDIUMTEXT NULL"),
    ("is_open",             "TINYINT NOT NULL DEFAULT 0"),
    ("client_type",         "VARCHAR(32) NULL"),
    ("siebel_contract",     "VARCHAR(64) NULL"),
    ("modified_at",         "BIGINT NULL"),
    ("problems_count",      "INT NOT NULL DEFAULT 0"),
]

HREF_RE = re.compile(r'<a[^>]*?eid=([A-Z0-9]+)[^>]*>', re.IGNORECASE)


def extract_id(raw):
    if not raw:
        return None
    m = HREF_RE.search(raw)
    if m:
        return m.group(1)
    stripped = re.sub(r"<[^>]+>", "", raw).strip()
    return stripped or None


def sql_escape(value):
    return value.replace("\\", "\\\\").replace("'", "''")


def to_sql(value, sql_type):
    if value is None:
        return "NULL"
    if isinstance(value, str) and value.strip() == "":
        return "NULL"
    t = sql_type.upper()
    if "DOUBLE" in t or "DECIMAL" in t:
        try:
            return repr(float(value))
        except (TypeError, ValueError):
            return "NULL"
    if "INT" in t or "BIGINT" in t or "TINYINT" in t:
        try:
            return str(int(float(value)))
        except (TypeError, ValueError):
            return "NULL"
    return f"'{sql_escape(str(value))}'"


def num(row, name):
    v = row.get(name, "")
    try:
        return int(float(v)) if v not in (None, "") else 0
    except (TypeError, ValueError):
        return 0


def parse_row(row):
    return [
        extract_id(row.get("ЕИ", "")),
        row.get("Дата регистрации") or None,
        num(row, "Кол-во поступивших ЕИ"),
        num(row, "Кол-во решенных ЕИ"),
        num(row, "Кол-во открытых ЕИ"),
        extract_id(row.get("МИ", "")),
        row.get("Работы") or None,
        row.get("Длительноть решения") or None,
        row.get("Подстатус") or None,
        row.get("Статус") or None,
        (row.get("Клиент") or "").strip('"') or None,
        row.get("Регион") or None,
        row.get("Гр. контролирующего") or None,
        row.get("Гр. исполнителя") or None,
        row.get("Гр. контролирующего МИ") or None,
        row.get("Гр. исполнителя МИ") or None,
        row.get("ГодНед") or None,
        row.get("Срок решения") or None,
        row.get("SLA ЕИ") or None,
        row.get("SLA МИ") or None,
        html.unescape(row.get("Решение МИ") or "") or None,
        html.unescape(row.get("Описание") or "") or None,
        html.unescape(row.get("Бизнес-описание") or "") or None,
        num(row, "Открыт"),
        row.get("Тип клиента") or None,
        row.get("№ Контракта из Зибель") or None,
        row.get("md") or None,
        num(row, "Проблемы"),
    ]


def main():
    with SRC.open(encoding="utf-8") as f:
        reader = csv.DictReader(f, quotechar="^")
        rows = [parse_row(r) for r in reader]

    lines = []
    lines.append("SET NAMES utf8mb4;")
    lines.append("SET time_zone = '+00:00';")
    lines.append("")
    lines.append("CREATE DATABASE IF NOT EXISTS remedy_mts CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    lines.append("USE remedy_mts;")
    lines.append("")
    lines.append("DROP TABLE IF EXISTS incidents_report;")
    col_defs = [f"  `{c[0]}` {c[1]}" for c in COLUMNS]
    lines.append("CREATE TABLE incidents_report (")
    lines.append(",\n".join(col_defs) + ",")
    lines.append("  PRIMARY KEY (ei_id),")
    lines.append("  KEY idx_created_at (created_at),")
    lines.append("  KEY idx_week_start (week_start),")
    lines.append("  KEY idx_status (status),")
    lines.append("  KEY idx_resolution_bucket (resolution_bucket),")
    lines.append("  KEY idx_client (client)")
    lines.append(") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;")
    lines.append("")

    col_names = ", ".join(f"`{c[0]}`" for c in COLUMNS)
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        chunk = rows[i:i + batch_size]
        values = []
        for r in chunk:
            parts = [to_sql(v, COLUMNS[idx][1]) for idx, v in enumerate(r)]
            values.append("(" + ", ".join(parts) + ")")
        lines.append(f"INSERT INTO incidents_report ({col_names}) VALUES")
        lines.append(",\n".join(values) + ";")
        lines.append("")

    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {DST} with {len(rows)} rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
