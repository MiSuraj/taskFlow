package com.taskflow.chat.dto;

import com.taskflow.chat.domain.Reaction;

import java.util.List;

public record ReactionResponse(String emoji, List<String> users) {
    public static ReactionResponse from(Reaction reaction) {
        return new ReactionResponse(reaction.getEmoji(), reaction.getUsers());
    }
}
