package com.ganshin.jsql.repo;

import com.ganshin.jsql.domain.Incident;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.IsoFields;
import java.util.List;
import java.util.Locale;

@Repository
public class IncidentRepository {

    private static final String SELECT_ALL = """
            SELECT
                ei_id,
                created_at,
                count_received,
                count_resolved,
                count_open,
                mi_id,
                work_id,
                resolution_hours,
                substatus,
                status,
                client,
                region,
                group_controller,
                group_executor,
                group_controller_mi,
                group_executor_mi,
                week_start,
                resolution_bucket,
                sla_ei,
                sla_mi,
                solution_mi,
                short_description,
                business_description,
                is_open,
                client_type,
                siebel_contract,
                modified_at,
                problems_count
            FROM incidents_report
            ORDER BY created_at
            """;

    private final JdbcTemplate jdbc;

    public IncidentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Incident> findAll() {
        return jdbc.query(SELECT_ALL, MAPPER);
    }

    private static final RowMapper<Incident> MAPPER = (ResultSet rs, int row) -> new Incident(
            rs.getString("ei_id"),
            toDateTime(rs.getTimestamp("created_at")),
            rs.getInt("count_received"),
            rs.getInt("count_resolved"),
            rs.getInt("count_open"),
            rs.getString("mi_id"),
            rs.getString("work_id"),
            (Double) rs.getObject("resolution_hours"),
            rs.getString("substatus"),
            rs.getString("status"),
            rs.getString("client"),
            rs.getString("region"),
            rs.getString("group_controller"),
            rs.getString("group_executor"),
            rs.getString("group_controller_mi"),
            rs.getString("group_executor_mi"),
            toLocalDate(rs),
            toIsoYearWeek(rs),
            rs.getString("resolution_bucket"),
            rs.getString("sla_ei"),
            rs.getString("sla_mi"),
            rs.getString("solution_mi"),
            rs.getString("short_description"),
            rs.getString("business_description"),
            rs.getInt("is_open") == 1,
            rs.getString("client_type"),
            rs.getString("siebel_contract"),
            (Long) rs.getObject("modified_at"),
            rs.getInt("problems_count")
    );

    private static LocalDateTime toDateTime(Timestamp ts) {
        return ts == null ? null : ts.toLocalDateTime();
    }

    private static LocalDate toLocalDate(ResultSet rs) throws SQLException {
        java.sql.Date d = rs.getDate("week_start");
        return d == null ? null : d.toLocalDate();
    }

    private static String toIsoYearWeek(ResultSet rs) throws SQLException {
        java.sql.Date d = rs.getDate("week_start");
        if (d == null) return null;
        LocalDate ld = d.toLocalDate();
        int year = ld.get(IsoFields.WEEK_BASED_YEAR);
        int week = ld.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        return String.format(Locale.ROOT, "%04d w%02d", year, week);
    }
}
