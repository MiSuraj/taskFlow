package com.taskflow.chat.dto;

import com.taskflow.identity.dto.UserSummary;

import java.time.Instant;
import java.util.List;

public record ChatMessageResponse(
        String id,
        String room,
        UserSummary sender,
        String text,
        List<UserSummary> mentions,
        List<ReactionResponse> reactions,
        Instant createdAt
) {
}
