package com.taskflow.chat.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreateRoomRequest(@NotBlank String name, @NotBlank String projectId, List<String> memberIds) {
}
