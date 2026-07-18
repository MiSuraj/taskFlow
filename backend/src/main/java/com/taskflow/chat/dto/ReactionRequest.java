package com.taskflow.chat.dto;

import jakarta.validation.constraints.NotBlank;

public record ReactionRequest(@NotBlank String emoji) {
}
