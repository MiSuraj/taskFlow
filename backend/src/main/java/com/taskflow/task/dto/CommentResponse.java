package com.taskflow.task.dto;

import com.taskflow.identity.dto.UserSummary;

import java.time.Instant;

public record CommentResponse(String text, UserSummary author, boolean isRejection, Instant createdAt) {
}
