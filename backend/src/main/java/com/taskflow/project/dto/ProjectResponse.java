package com.taskflow.project.dto;

import com.taskflow.identity.dto.UserSummary;

import java.time.Instant;
import java.util.List;

public record ProjectResponse(
        String id,
        String name,
        String description,
        UserSummary manager,
        List<UserSummary> members,
        UserSummary createdBy,
        Instant createdAt
) {
}
