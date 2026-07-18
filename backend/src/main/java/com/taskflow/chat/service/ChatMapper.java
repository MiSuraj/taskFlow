package com.taskflow.chat.service;

import com.taskflow.chat.domain.ChatMessage;
import com.taskflow.chat.domain.ChatRoom;
import com.taskflow.chat.dto.ChatMessageResponse;
import com.taskflow.chat.dto.ChatRoomResponse;
import com.taskflow.chat.dto.ReactionResponse;
import com.taskflow.identity.dto.UserSummary;
import com.taskflow.identity.repository.UserRepository;
import org.springframework.stereotype.Component;

@Component
public class ChatMapper {

    private final UserRepository userRepository;

    public ChatMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public ChatRoomResponse toResponse(ChatRoom room) {
        var members = room.getMembers().stream().map(this::resolveUser).filter(java.util.Objects::nonNull).toList();
        return new ChatRoomResponse(room.getId(), room.getName(), room.getProject(), members,
                resolveUser(room.getCreatedBy()), room.getCreatedAt());
    }

    public ChatMessageResponse toResponse(ChatMessage message) {
        var mentions = message.getMentions() == null ? java.util.List.<UserSummary>of()
                : message.getMentions().stream().map(this::resolveUser).filter(java.util.Objects::nonNull).toList();
        var reactions = message.getReactions().stream().map(ReactionResponse::from).toList();
        return new ChatMessageResponse(message.getId(), message.getRoom(), resolveUser(message.getSender()),
                message.getText(), mentions, reactions, message.getCreatedAt());
    }

    private UserSummary resolveUser(String userId) {
        return userId == null ? null : userRepository.findById(userId).map(UserSummary::from).orElse(null);
    }
}
