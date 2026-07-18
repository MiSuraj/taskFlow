package com.taskflow.chat.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record SendMessageRequest(@NotBlank String text, List<String> mentions) {
}
