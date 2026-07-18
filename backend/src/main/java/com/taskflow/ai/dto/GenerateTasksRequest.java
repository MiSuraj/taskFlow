package com.taskflow.ai.dto;

import jakarta.validation.constraints.NotBlank;

public record GenerateTasksRequest(@NotBlank String prompt) {
}
