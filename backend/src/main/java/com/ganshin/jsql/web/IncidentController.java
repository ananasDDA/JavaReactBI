package com.ganshin.jsql.web;

import com.ganshin.jsql.domain.Incident;
import com.ganshin.jsql.repo.IncidentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class IncidentController {

    private static final List<String> RESOLUTION_ORDER =
            List.of("<4", "4-12", "12-24", "24-72", ">72", "Не определено");

    private final IncidentRepository repo;

    @Value("${app.remedy.ei-url}")
    private String eiUrlTemplate;

    @Value("${app.remedy.mi-url}")
    private String miUrlTemplate;

    public IncidentController(IncidentRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/incidents")
    public Map<String, Object> incidents() {
        List<Incident> data = repo.findAll();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", LocalDateTime.now().toString());
        payload.put("count", data.size());
        payload.put("incidents", data);
        payload.put("meta", buildMeta(data));
        return payload;
    }

    @GetMapping("/meta")
    public Map<String, Object> meta() {
        return buildMeta(repo.findAll());
    }

    private Map<String, Object> buildMeta(List<Incident> data) {
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("remedyEiUrl", eiUrlTemplate);
        meta.put("remedyMiUrl", miUrlTemplate);
        meta.put("resolutionOrder", RESOLUTION_ORDER);

        meta.put("statuses", distinct(data, Incident::status));
        meta.put("substatuses", distinct(data, Incident::substatus));
        meta.put("clients", distinct(data, Incident::client));
        meta.put("regions", distinct(data, Incident::region));
        meta.put("clientTypes", distinct(data, Incident::clientType));
        meta.put("controllerGroups", distinct(data, Incident::groupController));
        meta.put("executorGroups", distinct(data, Incident::groupExecutor));

        Map<String, Long> yearWeekCounts = new TreeMap<>();
        for (Incident i : data) {
            if (i.yearWeek() != null) {
                yearWeekCounts.merge(i.yearWeek(), 1L, Long::sum);
            }
        }
        meta.put("yearWeeks", yearWeekCounts);
        return meta;
    }

    private static <T> List<String> distinct(List<Incident> data, java.util.function.Function<Incident, String> f) {
        return data.stream()
                .map(f)
                .filter(Objects::nonNull)
                .filter(s -> !s.isBlank())
                .distinct()
                .sorted(Comparator.naturalOrder())
                .collect(Collectors.toList());
    }
}
