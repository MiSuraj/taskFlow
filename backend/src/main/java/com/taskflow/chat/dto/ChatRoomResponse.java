package com.taskflow.chat.dto;

import com.taskflow.identity.dto.UserSummary;

import java.time.Instant;
import java.util.List;

public record ChatRoomResponse(
        String id, String name, String project, List<UserSummary> members, UserSummary createdBy, Instant createdAt
) {
}
