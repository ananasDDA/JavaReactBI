package com.ganshin.jsql;

import com.ganshin.jsql.domain.Incident;
import com.ganshin.jsql.repo.IncidentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SimpleDriverDataSource;

import javax.sql.DataSource;
import java.sql.Driver;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IncidentRepositoryTest {

    private JdbcTemplate jdbc;
    private IncidentRepository repo;

    @BeforeEach
    void setUp() throws Exception {
        String dbName = "itest_" + java.util.UUID.randomUUID().toString().replace("-", "");
        DataSource ds = new SimpleDriverDataSource(
                (Driver) Class.forName("org.h2.Driver").getDeclaredConstructor().newInstance(),
                "jdbc:h2:mem:" + dbName + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                "sa", "");
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("""
                CREATE TABLE incidents_report (
                  ei_id VARCHAR(32) PRIMARY KEY,
                  created_at TIMESTAMP NULL,
                  count_received TINYINT NOT NULL DEFAULT 0,
                  count_resolved TINYINT NOT NULL DEFAULT 0,
                  count_open TINYINT NOT NULL DEFAULT 0,
                  mi_id VARCHAR(32) NULL,
                  work_id VARCHAR(32) NULL,
                  resolution_hours DOUBLE NULL,
                  substatus VARCHAR(128) NULL,
                  status VARCHAR(64) NULL,
                  client VARCHAR(255) NULL,
                  region VARCHAR(128) NULL,
                  group_controller VARCHAR(255) NULL,
                  group_executor VARCHAR(255) NULL,
                  group_controller_mi VARCHAR(255) NULL,
                  group_executor_mi VARCHAR(255) NULL,
                  week_start DATE NULL,
                  resolution_bucket VARCHAR(16) NULL,
                  sla_ei VARCHAR(32) NULL,
                  sla_mi VARCHAR(32) NULL,
                  solution_mi CLOB NULL,
                  short_description CLOB NULL,
                  business_description CLOB NULL,
                  is_open TINYINT NOT NULL DEFAULT 0,
                  client_type VARCHAR(32) NULL,
                  siebel_contract VARCHAR(64) NULL,
                  modified_at BIGINT NULL,
                  problems_count INT NOT NULL DEFAULT 0
                )
                """);
        jdbc.update("""
                INSERT INTO incidents_report
                (ei_id, created_at, count_received, count_resolved, count_open, mi_id, work_id, resolution_hours,
                 substatus, status, client, region, group_controller, group_executor, group_controller_mi,
                 group_executor_mi, week_start, resolution_bucket, sla_ei, sla_mi, solution_mi, short_description,
                 business_description, is_open, client_type, siebel_contract, modified_at, problems_count)
                VALUES
                ('MSK000029912381', '2025-02-24 15:16:10', 0, 1, 0, NULL, NULL, 16.135,
                 'sub', 'closed', 'clientA', 'regionA', 'grp1', 'grp2', NULL, NULL,
                 '2025-02-24', '12-24', '-68:16', NULL, NULL, 'desc', 'biz', 0, 'mobile',
                 '1-828527356047', 1740720900, 0)
                """);
        jdbc.update("""
                INSERT INTO incidents_report
                (ei_id, created_at, count_received, count_resolved, count_open, week_start, resolution_bucket,
                 status, client_type, client, is_open, problems_count)
                VALUES
                ('MSK000000000002', '2025-12-29 10:00:00', 1, 0, 1, '2025-12-29', '<4',
                 'assigned', 'mobile', 'ACME', 1, 0)
                """);

        repo = new IncidentRepository(jdbc);
    }

    @Test
    void loadsAllRows() {
        List<Incident> rows = repo.findAll();
        assertEquals(2, rows.size());
    }

    @Test
    void computesIsoYearWeek() {
        List<Incident> rows = repo.findAll();
        Incident first = rows.stream().filter(i -> "MSK000029912381".equals(i.eiId())).findFirst().orElseThrow();
        assertNotNull(first.yearWeek());
        assertTrue(first.yearWeek().matches("\\d{4} w\\d{2}"), "got: " + first.yearWeek());
        assertEquals("2025 w09", first.yearWeek());
    }

    @Test
    void handlesIsoWeekAcrossYears() {
        List<Incident> rows = repo.findAll();
        Incident jan = rows.stream().filter(i -> "MSK000000000002".equals(i.eiId())).findFirst().orElseThrow();
        assertEquals("2026 w01", jan.yearWeek());
        assertTrue(jan.isOpen());
        assertFalse(rows.stream().filter(i -> "MSK000029912381".equals(i.eiId())).findFirst().orElseThrow().isOpen());
    }
}
