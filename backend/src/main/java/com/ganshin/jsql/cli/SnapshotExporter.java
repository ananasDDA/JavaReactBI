package com.ganshin.jsql.cli;

import com.ganshin.jsql.domain.Incident;
import com.ganshin.jsql.repo.IncidentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class SnapshotExporter implements ApplicationRunner {

    private static final String ARG = "export";

    private final IncidentRepository repo;
    private final ConfigurableApplicationContext ctx;

    public SnapshotExporter(IncidentRepository repo, ConfigurableApplicationContext ctx) {
        this.repo = repo;
        this.ctx = ctx;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!args.containsOption(ARG)) {
            return;
        }
        List<String> values = args.getOptionValues(ARG);
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException("--export requires a file path");
        }
        Path target = Path.of(values.get(0)).toAbsolutePath();
        Files.createDirectories(target.getParent());

        List<Incident> incidents = repo.findAll();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", LocalDateTime.now().toString());
        payload.put("count", incidents.size());
        payload.put("source", "spring-boot-snapshot");
        payload.put("incidents", incidents);

        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .enable(SerializationFeature.INDENT_OUTPUT);

        mapper.writeValue(target.toFile(), payload);
        System.out.println("Wrote snapshot: " + target + " (" + incidents.size() + " rows)");

        int code = SpringApplication.exit(ctx, () -> 0);
        System.exit(code);
    }
}
