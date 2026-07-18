package com.taskflow.task.dto;

import com.taskflow.identity.dto.UserSummary;
import com.taskflow.task.domain.TaskStatus;

import java.time.Instant;
import java.util.List;

public record TaskResponse(
        String id,
        String title,
        String description,
        String type,
        TaskStatus status,
        ProjectSummary project,
        UserSummary createdBy,
        UserSummary assignedTo,
        UserSummary qaAssignedTo,
        List<TimeLogResponse> timeLogs,
        List<CommentResponse> comments,
        long totalTime,
        int rejectionCount,
        int queuePosition,
        Instant createdAt
) {
}
