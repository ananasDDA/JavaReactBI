# Исходный SELECT

Ниже — оригинальный запрос из `docs/source_select.docx`, использующийся в отчёте Superset
"Обращаемость клиентов pLTE". Он приведён в исходном виде (с `CONCAT('<a href=...>', ..., '</a>')`
для формирования ссылок на Remedy) и с русскоязычными алиасами в обратных кавычках.

Этот запрос служит эталоном для бэкенда. В проекте используется упрощённая плоская витрина
`remedy_mts.incidents_report` (см. `docker/seed.sql`) с уже вычисленными полями, чтобы не
тянуть оригинальную схему Remedy; семантика колонок полностью сохранена.

```sql
SELECT
    CONCAT(
        '<a href="https://remedy.msk.mts.ru/arsys/servlet/ViewFormServlet?form=I2%3ASingleIncidents&server=remedy-prom&eid=',
        a.REQUEST_ID,
        '" target="_blank">',
        a.REQUEST_ID,
        '</a>'
    )                                                                   AS `ЕИ`,
    FROM_UNIXTIME(a.createdate)                                         AS `Дата регистрации`,
    a.status IN ('Назначен')                                            AS `Кол-во поступивших ЕИ`,
    a.status IN ('Закрыт','Решен')                                      AS `Кол-во решенных ЕИ`,
    a.status IN ('Назначен','В работе','Активное ожидание')             AS `Кол-во открытых ЕИ`,
    CONCAT(
        '<a href="https://remedy.msk.mts.ru/arsys/servlet/ViewFormServlet?form=I2%3AIncidents&server=remedy-prom&eid=',
        a.mi_id,
        '" target="_blank">',
        a.mi_id,
        '</a>'
    )                                                                   AS `МИ`,
    a.workid                                                            AS `Работы`,
    (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600   AS `Длительноть решения`,
    Substatus                                                           AS `Подстатус`,
    a.STATUS                                                            AS `Статус`,
    CLIENT                                                              AS `Клиент`,
    a.HWREGION                                                          AS `Регион`,
    a.gname1                                                            AS `Гр. контролирующего`,
    a.gname2                                                            AS `Гр. исполнителя`,
    b.gname1                                                            AS `Гр. контролирующего МИ`,
    b.gname2                                                            AS `Гр. исполнителя МИ`,
    DATE_SUB(
        DATE(FROM_UNIXTIME(a.createdate)),
        INTERVAL WEEKDAY(FROM_UNIXTIME(a.createdate)) DAY
    )                                                                   AS `ГодНед`,
    CASE
        WHEN (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600 < 4  THEN '<4'
        WHEN (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600 >= 4
         AND (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600 < 12 THEN '4-12'
        WHEN (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600 >= 12
         AND (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600 < 24 THEN '12-24'
        WHEN (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600 >= 24
         AND (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600 < 72 THEN '24-72'
        WHEN (COALESCE(time5, a.closetime, UNIX_TIMESTAMP()) - a.time2) / 3600 >= 72 THEN '>72'
        ELSE 'Не определено'
    END                                                                 AS `Срок решения`,
    a.TimeLeftSLA_Txt                                                   AS `SLA ЕИ`,
    b.TimeLeftSLA_Txt                                                   AS `SLA МИ`,
    b.SOLUTION                                                          AS `Решение МИ`,
    a.Short_Description                                                 AS `Описание`,
    a.BUSINESSDESCRIPTION                                               AS `Бизнес-описание`,
    a.closetime IS NULL                                                 AS `Открыт`,
    CASE
        WHEN a.Contract_Num IN (
                '131306706258','180302652354','142397835060','142397835060','142398298265',
                '192306738142','124700609342','124701702085','148306266266','151333436508',
                '151333437532','151333589634','125393015450','125393151324','110331723693',
                '114306296508','114305668570','114306979194','114306060248','114306415439',
                '114307009092','119392531700','127389921202'
             ) AND a.gname1 LIKE '%ОТПКК%' THEN 'Фиксированный'
        ELSE 'Мобильный'
    END                                                                 AS `Тип клиента`,
    a.SBLSR_ID                                                          AS `№ Контракта из Зибель`,
    a.MODIFIED_DATE                                                     AS md,
    COUNT(prob_id)                                                      AS `Проблемы`
FROM       RemedyMTS.SINGLEINCIDENTS_Dboard a
LEFT JOIN  RemedyMTS.INCIDENTS_Board       b ON a.mi_id   = b.request_id
LEFT JOIN  RemedyMTS.PROBLEMS              c ON b.prob_id = c.request_id
WHERE (
        (a.Siebel_Theme = 'Private LTE' AND a.Siebel_Subjects = 'Проблемы с сервисом')
        OR (
            a.Contract_Num IN (
                '131306706258','180302652354','142397835060','142397835060','142398298265',
                '192306738142','124700609342','124701702085','148306266266','151333436508',
                '151333437532','151333589634','125393015450','125393151324','110331723693',
                '114306296508','114305668570','114306979194','114306060248','114306415439',
                '114307009092','119392531700','127389921202'
            ) AND a.gname1 LIKE '%ОТПКК%'
        )
      )
  AND a.CREATEDATE >= UNIX_TIMESTAMP('2025-01-01')
GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27
ORDER BY 2;
```

## Семантика колонок

| Алиас                      | Тип      | Смысл                                                                 |
|----------------------------|----------|------------------------------------------------------------------------|
| `ЕИ`                       | HTML     | Ссылка на Единичный Инцидент в Remedy (отрендеренный `<a>`)            |
| `Дата регистрации`         | datetime | `FROM_UNIXTIME(a.createdate)`                                          |
| `Кол-во поступивших ЕИ`    | 0/1      | Флаг: `status = 'Назначен'`                                            |
| `Кол-во решенных ЕИ`       | 0/1      | Флаг: `status IN ('Закрыт','Решен')`                                   |
| `Кол-во открытых ЕИ`       | 0/1      | Флаг: `status IN ('Назначен','В работе','Активное ожидание')`          |
| `МИ`                       | HTML     | Ссылка на Массовый Инцидент (родительский тикет)                       |
| `Работы`                   | string   | ID связанных работ                                                     |
| `Длительноть решения`      | hours    | Часы с момента `time2` до `COALESCE(time5, closetime, now)`            |
| `Подстатус`                | enum     | `Substatus`                                                            |
| `Статус`                   | enum     | `STATUS`                                                               |
| `Клиент`                   | string   | `CLIENT`                                                               |
| `Регион`                   | string   | `HWREGION`                                                             |
| `Гр. контролирующего`      | string   | `a.gname1`                                                             |
| `Гр. исполнителя`          | string   | `a.gname2`                                                             |
| `Гр. контролирующего МИ`   | string   | `b.gname1`                                                             |
| `Гр. исполнителя МИ`       | string   | `b.gname2`                                                             |
| `ГодНед`                   | date     | Понедельник ISO-недели регистрации                                     |
| `Срок решения`             | bucket   | `<4 / 4-12 / 12-24 / 24-72 / >72 / Не определено`                     |
| `SLA ЕИ`                   | `H:MM`   | Остаток SLA по ЕИ                                                      |
| `SLA МИ`                   | `H:MM`   | Остаток SLA по МИ                                                      |
| `Решение МИ`               | text     | Текст решения                                                          |
| `Описание`                 | text     | Короткое описание                                                      |
| `Бизнес-описание`          | text     | Бизнес-описание (часто письмо клиента)                                 |
| `Открыт`                   | 0/1      | `closetime IS NULL`                                                    |
| `Тип клиента`              | enum     | `Фиксированный` по списку договоров и `ОТПКК`, иначе `Мобильный`       |
| `№ Контракта из Зибель`    | string   | `SBLSR_ID`                                                             |
| `md`                       | unix_ts  | `MODIFIED_DATE`                                                        |
| `Проблемы`                 | int      | `COUNT(prob_id)`                                                       |

## Правки поверх оригинального отчёта

1. Колонки сводных таблиц (заголовки периодов) заменяются на текстовое представление
   ISO-недели в формате `YYYY wWW` (например, `2026 w16`). Сортировка — по возрастанию
   числового `YEARWEEK(createdate, 3)`.
2. Значения `Срок решения` в строках сводной таблицы и в фильтре сортируются в явно
   заданном порядке: `<4 → 4-12 → 12-24 → 24-72 → >72 → Не определено`.
