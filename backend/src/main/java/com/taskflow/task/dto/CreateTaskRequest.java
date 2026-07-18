package com.taskflow.task.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateTaskRequest(@NotBlank String title, String description, String type, @NotBlank String projectId) {
}
