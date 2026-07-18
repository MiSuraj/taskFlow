package com.taskflow.chat.dto;

import com.taskflow.identity.dto.UserSummary;

public record TypingMessage(UserSummary user, boolean typing) {
}
