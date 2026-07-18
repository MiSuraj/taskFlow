package com.taskflow.identity.dto;

import com.taskflow.identity.domain.User;

/** Lightweight population shape reused wherever a project/task/chat response embeds a user reference. */
public record UserSummary(String id, String username, String role) {
    public static UserSummary from(User user) {
        return user == null ? null : new UserSummary(user.getId(), user.getUsername(), user.getRole());
    }
}
