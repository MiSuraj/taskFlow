package com.taskflow.task.dto;

import jakarta.validation.constraints.NotBlank;

public record AssignRequest(@NotBlank String userId) {
}
