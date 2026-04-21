package com.ganshin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/reports")
@CrossOrigin(origins = "*")
class ReportController {

    private final JdbcTemplate jdbcTemplate;

    public ReportController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static final String BASE_SQL = """
        SELECT
        CONCAT('<a href="https://remedy.msk.mts.ru/arsys/servlet/ViewFormServlet?form=I2%3ASingleIncidents&server=remedy-prom&eid=', a.REQUEST_ID, '"target="_blank">', a.REQUEST_ID, '</a>') ЕИ,
        FROM_UNIXTIME(a.createdate) `Дата регистрации`,
        FROM_UNIXTIME(COALESCE(a.TIME5, a.CLOSETIME)) `Дата решения`,
        1 `Кол-во поступивших ЕИ`,
        COALESCE(a.TIME5, a.CLOSETIME) IS NOT NULL `Кол-во решенных ЕИ`,
        COALESCE(a.TIME5, a.CLOSETIME) IS NULL     `Кол-во открытых ЕИ`,
        CONCAT('<a href="https://remedy.msk.mts.ru/arsys/servlet/ViewFormServlet?form=I2%3AIncidents&server=remedy-prom&eid=', a.mi_id, '"target="_blank">', a.mi_id, '</a>') МИ,
        a.workid Работы,
        (COALESCE(a.TIME5, a.CLOSETIME, UNIX_TIMESTAMP()) - a.TIME2) / 3600 `Длительность решения`,
        Substatus Подстатус,
        a.STATUS Статус,
        CLIENT Клиент,
        a.HWREGION Регион,
        a.gname1 `Гр. контролирующего`,
        a.gname2 `Гр. исполнителя`,
        b.gname1 `Гр. контролирующего МИ`,
        b.gname2 `Гр. исполнителя МИ`,
        DATE_SUB(DATE(FROM_UNIXTIME(a.createdate)), INTERVAL WEEKDAY(FROM_UNIXTIME(a.createdate)) DAY) ГодНед,
        CASE
            WHEN (COALESCE(a.TIME5, a.CLOSETIME, UNIX_TIMESTAMP()) - a.TIME2) / 3600 < 4  THEN '<4'
            WHEN (COALESCE(a.TIME5, a.CLOSETIME, UNIX_TIMESTAMP()) - a.TIME2) / 3600 < 12 THEN '4-12'
            WHEN (COALESCE(a.TIME5, a.CLOSETIME, UNIX_TIMESTAMP()) - a.TIME2) / 3600 < 24 THEN '12-24'
            WHEN (COALESCE(a.TIME5, a.CLOSETIME, UNIX_TIMESTAMP()) - a.TIME2) / 3600 < 72 THEN '24-72'
            ELSE '>72'
        END AS `Срок решения`,
        a.TimeLeftSLA_Txt `SLA ЕИ`,
        b.TimeLeftSLA_Txt `SLA МИ`,
        b.SOLUTION        `Решение МИ`,
        a.Short_Description `Описание`,
        a.BUSINESSDESCRIPTION `Бизнес-описание`,
        COALESCE(a.TIME5, a.CLOSETIME) IS NULL Открыт,
        CASE
            WHEN a.Contract_Num IN ('131306706258','180302652354','142397835060','192306738142','127389921202')
                THEN 'Фиксированный'
            ELSE 'Мобильный'
        END `Тип клиента`,
        a.SBLSR_ID `№ Контракта из Зибель`,
        a.MODIFIED_DATE md,
        COUNT(prob_id) Проблемы
        FROM RemedyMTS.SINGLEINCIDENTS_Dboard a
        LEFT JOIN RemedyMTS.INCIDENTS_Board b ON a.mi_id = b.request_id
        LEFT JOIN RemedyMTS.PROBLEMS        c ON b.prob_id = c.request_id
        WHERE ((a.Siebel_Theme = 'Private LTE' AND a.Siebel_Subjects = 'Проблемы с сервисом')
            OR  a.Contract_Num IN ('131306706258','180302652354','142397835060','192306738142','127389921202'))
            AND a.CREATEDATE >= UNIX_TIMESTAMP('2025-01-01')
        GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28
        """;

    @GetMapping("/data231")
    @ResponseBody
    public List<Map<String, Object>> getReportData(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String clientType,
            @RequestParam(required = false) String ei,
            @RequestParam(required = false) String client,
            @RequestParam(required = false) String mi,
            @RequestParam(required = false) String slaEi,
            @RequestParam(required = false) String slaMi,
            @RequestParam(required = false) String slaBucket,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String durationFrom,
            @RequestParam(required = false) String durationTo) {

        StringBuilder sql = new StringBuilder("SELECT * FROM (")
                .append(BASE_SQL)
                .append(") AS t WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (isSet(status)) {
            sql.append(" AND t.Статус = ?");
            params.add(status);
        }
        if (isSet(clientType)) {
            sql.append(" AND t.`Тип клиента` = ?");
            params.add(clientType);
        }
        if (isSet(ei)) {
            sql.append(" AND t.ЕИ LIKE ?");
            params.add("%" + ei + "%");
        }
        if (isSet(client)) {
            sql.append(" AND t.Клиент LIKE ?");
            params.add("%" + client + "%");
        }
        if (isSet(mi)) {
            sql.append(" AND t.МИ LIKE ?");
            params.add("%" + mi + "%");
        }
        if (isSet(slaEi)) {
            sql.append(" AND t.`SLA ЕИ` LIKE ?");
            params.add("%" + slaEi + "%");
        }
        if (isSet(slaMi)) {
            sql.append(" AND t.`SLA МИ` LIKE ?");
            params.add("%" + slaMi + "%");
        }
        if (isSet(slaBucket)) {
            sql.append(" AND t.`Срок решения` = ?");
            params.add(slaBucket);
        }
        if (isSet(dateFrom)) {
            sql.append(" AND DATE(t.`Дата регистрации`) >= ?");
            params.add(dateFrom);
        }
        if (isSet(dateTo)) {
            sql.append(" AND DATE(t.`Дата регистрации`) <= ?");
            params.add(dateTo);
        }
        if (isSet(durationFrom)) {
            sql.append(" AND t.`Длительность решения` >= ?");
            params.add(Double.parseDouble(durationFrom));
        }
        if (isSet(durationTo)) {
            sql.append(" AND t.`Длительность решения` <= ?");
            params.add(Double.parseDouble(durationTo));
        }

        sql.append(" ORDER BY t.`Дата регистрации` DESC");
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    @GetMapping("/m231")
    public String showReportPage() {
        return "m231";
    }

    private static boolean isSet(String v) {
        return v != null && !v.isEmpty();
    }
}
