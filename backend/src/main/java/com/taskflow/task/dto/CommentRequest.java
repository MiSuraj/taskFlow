package com.taskflow.task.dto;

import jakarta.validation.constraints.NotBlank;

public record CommentRequest(@NotBlank String text, Boolean isRejection) {
}
