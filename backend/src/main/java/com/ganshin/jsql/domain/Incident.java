package com.ganshin.jsql.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record Incident(
        String eiId,
        LocalDateTime createdAt,
        int countReceived,
        int countResolved,
        int countOpen,
        String miId,
        String workId,
        Double resolutionHours,
        String substatus,
        String status,
        String client,
        String region,
        String groupController,
        String groupExecutor,
        String groupControllerMi,
        String groupExecutorMi,
        LocalDate weekStart,
        String yearWeek,
        String resolutionBucket,
        String slaEi,
        String slaMi,
        String solutionMi,
        String shortDescription,
        String businessDescription,
        boolean isOpen,
        String clientType,
        String siebelContract,
        Long modifiedAt,
        int problemsCount
) {}
