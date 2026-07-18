package com.taskflow.chat.dto;

import jakarta.validation.constraints.NotBlank;

public record RoomMemberRequest(@NotBlank String userId) {
}
