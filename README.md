# JavaSQL BI — порт отчёта "Обращаемость клиентов pLTE" из Superset

Полнофункциональный порт дашборда Apache Superset в программную BI-систему
на Java + React, работающий как с живой MySQL, так и полностью офлайн
(GitHub Pages + запечённый снимок данных).

Исходные материалы (в `docs/`):

- `source_select.docx` — оригинальный SQL-запрос отчёта;
- `source_query.csv`   — актуальный экспорт выборки (96 строк) со сложным
                         форматом (кавычка `^`, HTML-ссылки внутри колонок);
- `source_dashboard.zip` — скриншот оригинального дашборда;
- `select.md`          — оригинальный SELECT в читаемом виде + семантика колонок.

## Что изменено относительно оригинального отчёта

1. Заголовки колонок сводных таблиц представлены текстом в формате ISO-недели:
   `YYYY wWW` (например, `2025 w41`, `2026 w01`). Сортировка — по возрастанию
   числового ключа `yearIso * 100 + weekIso`.
2. Значения столбца "Срок решения" сортируются в фиксированном порядке:
   `<4 → 4-12 → 12-24 → 24-72 → >72 → Не определено`. Этот порядок используется
   везде: в пивоте, в выпадающем фильтре и при сортировке колонки в таблице.

## Содержание репозитория

```
.
├── backend/                   Spring Boot 3.3 + JDBC + MySQL, Gradle
├── frontend/                  React 18 + TypeScript + Vite + Ant Design + ECharts
├── docker/                    docker-compose для локальной MySQL 8.4 + seed.sql
├── docs/                      Исходные материалы и документация по SELECT
├── scripts/                   Python-скрипты-сидеры (CSV -> SQL и CSV -> JSON)
└── .github/workflows/         CI и публикация на GitHub Pages
```

## Архитектура

### Backend (`backend/`)

Java 17, Spring Boot 3.3.13, JDBC + HikariCP, MySQL Connector/J.

- `com.ganshin.jsql.domain.Incident`         — плоская запись отчёта (28 полей +
  вычисленная ISO-неделя `yearWeek`).
- `com.ganshin.jsql.repo.IncidentRepository` — `JdbcTemplate`, выполняет
  единственный SELECT к таблице-витрине `incidents_report`; вычисляет
  ISO-неделю в Java (`java.time.temporal.IsoFields`).
- `com.ganshin.jsql.web.IncidentController`  — REST:
  - `GET /api/incidents` — весь датасет + мета (источник для фронта);
  - `GET /api/meta`      — только мета: справочники для фильтров, шаблоны
    URL Remedy, фиксированный `resolutionOrder`, счётчик недель.
- `com.ganshin.jsql.cli.SnapshotExporter`    — `ApplicationRunner`, активируется
  флагом `--export=<path>`; выгружает данные в JSON и завершает процесс. Этот
  механизм используется для создания статичного `data.json` для GitHub Pages.
- `com.ganshin.jsql.config.CorsConfig`       — разрешает CORS для dev-фронта
  (`http://localhost:5173`).

Витрина `incidents_report` (см. `docker/seed.sql`) — денормализованная копия
оригинального отчёта: в ней уже лежат вычисленные `resolution_bucket`
(`<4`..`>72`), `week_start` (понедельник ISO-недели), `is_open`, `client_type`
и др. Это позволяет обойтись без воспроизведения схемы Remedy и одновременно
сохранить всю семантику исходного SELECT (см. `docs/select.md`).

### Frontend (`frontend/`)

React 18 + TypeScript + Vite + pnpm. UI — Ant Design 5, графика — Apache
ECharts, состояние фильтров — Zustand.

Ключевой момент: **все агрегации делаются на клиенте** поверх плоского списка
инцидентов. Это даёт:

- мгновенную реакцию любых фильтров (изменения не ходят на сервер);
- одинаковое поведение в двух режимах работы — с живой MySQL и на статичном
  снимке JSON.

Структура:

```
frontend/src/
├── api/client.ts            Загрузка данных: api | static | auto (дефолт)
├── lib/
│   ├── weekFormat.ts        "2026 w16" + yearWeekKey для сортировки
│   ├── resolutionOrder.ts   Фиксированный порядок бакетов длительности
│   └── aggregate.ts         KPI, monthly combo, два пивота
├── state/filters.ts         Zustand-стор фильтров
├── components/
│   ├── layout/              Сетка дашборда
│   ├── filters/             Сайдбар
│   ├── kpi/                 KPI-карточка
│   ├── charts/              Комбо bar+line
│   ├── pivot/               Две сводные таблицы (c ручной сортировкой)
│   └── tables/              Две таблицы детализации
└── types.ts                 Incident, DataSet, Filters
```

Режим источника данных выбирается через переменную `VITE_DATA_SOURCE`:

| Значение           | Поведение                                                        |
|--------------------|------------------------------------------------------------------|
| `api`              | Фетч `/api/incidents` (бэкенд обязателен)                        |
| `static`           | Фетч `./data.json` (только запечённый снимок)                    |
| `auto` (дефолт)    | Сначала пробует `/api/incidents`, при неудаче падает в `static`  |

Base path Vite настраивается через `VITE_BASE` (по умолчанию `/JavaSQL/` —
поведение GitHub Pages). Для локального dev используется прокси `/api` → `:8080`.

### Порядок обработки данных

1. CSV из Superset (`docs/source_query.csv`) является эталоном данных. Он
   парсится скриптами:
   - `scripts/csv_to_seed.py` — генерирует `docker/seed.sql` для MySQL;
   - `scripts/csv_to_datajson.py` — генерирует `frontend/public/data.json`
     для статичного режима. Оба скрипта применяют идентичные правила:
     извлечение ID из `<a href=...eid=…>`, извлечение `yearWeek` из даты,
     декодирование HTML-сущностей, нормализация пустых значений.
2. MySQL отдаёт витрину `incidents_report`, бэкенд читает её одним SELECT,
   мэппит в `Incident` и вычисляет `yearWeek` из `week_start` (пн ISO-недели)
   через `java.time.temporal.IsoFields`.
3. Фронт получает плоский список и в каждом рендере применяет фильтры + считает
   KPI/комбо-чарт/пивоты в чистых функциях `lib/aggregate.ts`.

## Требования

- Java 17+ (протестировано на Temurin 17 и OpenJDK 23)
- Node 18+ (протестировано на Node 20 и 25)
- pnpm 9+
- Docker Desktop (только если поднимаете живую MySQL)
- Python 3.9+ (только для скриптов-сидеров)

## Быстрый старт — только фронт, офлайн

Минимальный сценарий: посмотреть/задеплоить дашборд без бэкенда.

```bash
python3 scripts/csv_to_datajson.py
cd frontend
pnpm install
pnpm build
VITE_DATA_SOURCE=static pnpm preview --port 4173
# откройте http://127.0.0.1:4173/JavaSQL/
```

Чтобы запечь статичный dist для GitHub Pages:

```bash
cd frontend
VITE_DATA_SOURCE=static VITE_BASE=/JavaSQL/ pnpm build
# frontend/dist/ готов к деплою на Pages
```

## Полный цикл — бэкенд + MySQL + фронт

### 1. Поднять MySQL

```bash
docker compose -f docker/docker-compose.yml up -d
```

Контейнер `javasql-mysql` слушает `localhost:3307`, `seed.sql` применяется на
первом старте. Креды: `app` / `apppwd`, БД `remedy_mts`.

Проверка:

```bash
docker exec javasql-mysql mysql -uapp -papppwd \
  -e "SELECT COUNT(*) FROM remedy_mts.incidents_report;"
# 96
```

### 2. Запустить бэкенд

```bash
cd backend
./gradlew bootRun
# REST API: http://localhost:8080/api/incidents
```

### 3. Запустить фронт в dev-режиме (с живой API)

В другой вкладке:

```bash
cd frontend
pnpm install
pnpm dev
# http://localhost:5173/JavaSQL/
```

Vite проксирует `/api/*` → `http://localhost:8080`, поэтому фронт будет ходить
в живую MySQL через бэкенд.

### 4. Пересобрать статичный снимок из MySQL

Вместо CSV-сидера можно сгенерировать `data.json` прямо из MySQL через бэкенд
(идентичная схема `Incident`):

```bash
cd backend
./gradlew bootRun --args="--export=../frontend/public/data.json"
```

Бэкенд запустится, выгрузит данные и завершится. После этого
`frontend/public/data.json` готов к запеканию в `pnpm build`.

## Тесты

### Бэкенд

```bash
cd backend
./gradlew test
```

Тесты (`IncidentRepositoryTest`) используют H2 в MySQL-совместимом режиме и
проверяют:

- загрузку всех строк;
- корректное вычисление ISO-недели для обычной даты (`2025 w09`);
- переход недели через границу года: `2025-12-29` относится к `2026 w01`;
- флаг `isOpen` на основе колонки `is_open`.

### Фронт

```bash
cd frontend
pnpm test
```

Тесты (vitest, 16 штук) покрывают `lib/`:

- `weekFormat` — формат `YYYY wWW`, padding, инвариант сортировки, краевые
  случаи (переход через год);
- `resolutionOrder` — фиксированный порядок бакетов `<4..>72`, сортировка,
  позиция неизвестных значений;
- `aggregate` — все ключевые функции: `applyFilters`, `computeKpi`,
  `computeMonthly` (группировка по месяцам с корректным хронологическим
  порядком), оба пивота (срок решения с соблюдением порядка,
  подстатус с русской локалью сортировки).

### Типы + сборка

```bash
cd frontend
pnpm lint   # tsc --noEmit
pnpm build
```

## Правила проекта

- В коде нет комментариев: все пояснения вынесены в документацию (README,
  `docs/select.md`). Обновляйте документацию вместе с кодом.
- Скрипты-сидеры полностью воспроизводят данные из `docs/source_query.csv` —
  это эталон. Если нужно добавить поле — меняйте оба скрипта синхронно
  (`csv_to_seed.py` и `csv_to_datajson.py`) и `Incident.java` + `types.ts`.
- Порядок "Срок решения" определён в одном месте в каждой языковой базе:
  `resolutionOrder.ts` на фронте и `IncidentController.RESOLUTION_ORDER` на
  бэке. Синхронизируйте вручную.
- Base-path фронта для Pages — `/JavaSQL/`. Если форк переименован, передайте
  `VITE_BASE=/имя-репо/` при сборке (workflow `pages.yml` делает это
  автоматически).

## Структура API

### `GET /api/incidents`

```json
{
  "generatedAt": "2026-04-20T01:18:06.804",
  "count": 96,
  "incidents": [ { /* Incident */ } ],
  "meta": { /* DataSetMeta */ }
}
```

### `GET /api/meta`

```json
{
  "remedyEiUrl": "https://remedy.msk.mts.ru/...eid={id}",
  "remedyMiUrl": "https://remedy.msk.mts.ru/...eid={id}",
  "resolutionOrder": ["<4", "4-12", "12-24", "24-72", ">72", "Не определено"],
  "statuses": ["В работе", "Закрыт", "Зарегистрирован", "Назначен"],
  "substatuses": [ "..." ],
  "clients": [ "..." ],
  "regions": [ "..." ],
  "clientTypes": ["Мобильный"],
  "controllerGroups": [ "..." ],
  "executorGroups": [ "..." ],
  "yearWeeks": { "2025 w09": 2, "2025 w11": 3, "...": 0 }
}
```

## Публикация на GitHub Pages

Workflow `.github/workflows/pages.yml` автоматически:

1. Выполняет `scripts/csv_to_datajson.py`, чтобы запечь `frontend/public/data.json`
   из CSV.
2. Собирает фронт командой `pnpm build` с `VITE_DATA_SOURCE=static` и
   `VITE_BASE=/${REPO_NAME}/`.
3. Публикует `frontend/dist` на Pages (`actions/deploy-pages@v4`).

Чтобы workflow прошёл, в настройках репозитория нужно:

- Settings → Pages → Source = GitHub Actions.
- Разрешить workflow'ам запись через `Settings → Actions → General → Workflow
  permissions → Read and write`.

## CI

`.github/workflows/ci.yml` гоняет на каждый push/PR:

- `backend`: `./gradlew test` на JDK 17 (H2 in-memory);
- `frontend`: `pnpm test` + `pnpm build` (включая генерацию `data.json` из CSV).

## Известные особенности исходных данных

- В CSV Superset'а нестандартная кавычка — `^` вместо `"`. Скрипты это учитывают.
- Колонки `ЕИ` и `МИ` содержат HTML `<a href="...eid=ID">...</a>` — скрипты
  извлекают чистые ID; фронт формирует ссылки сам из шаблонов в `meta`.
- Поле `Длительноть решения` в исходнике с опечаткой; мы используем ASCII
  `resolution_hours`.
- В `Срок решения` встречается `Не определено`, когда не задано ни `time5`,
  ни `closetime` (в оригинальном SQL подставляется `UNIX_TIMESTAMP()`, но
  бакет всё равно может получиться пустым). Этот бакет выводится последним.

## На будущее

- Серверные фильтры `GET /api/incidents?from=&to=&client=` — если объём данных
  вырастет в разы (сейчас 96 строк делают клиентские фильтры полностью
  оправданными).
- Экспорт CSV/XLSX таблиц детализации из UI (antd `Table` + библиотека
  `xlsx`).
- Реальная авторизация (LDAP), если потребуется — в `backend/build.gradle`
  готово место для подключения `spring-security-ldap` из оригинального
  фрагмента в `docs/source_select.docx`.
