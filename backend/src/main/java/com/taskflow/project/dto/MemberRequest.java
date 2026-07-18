package com.taskflow.project.dto;

import jakarta.validation.constraints.NotBlank;

public record MemberRequest(@NotBlank String userId) {
}
