package com.taskflow.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record InviteUserRequest(@NotBlank String username, @NotBlank String password, @NotBlank String role) {
}
