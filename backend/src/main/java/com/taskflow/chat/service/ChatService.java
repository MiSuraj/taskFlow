package com.taskflow.chat.service;

import com.taskflow.chat.domain.ChatMessage;
import com.taskflow.chat.domain.ChatRoom;
import com.taskflow.chat.domain.Reaction;
import com.taskflow.chat.repository.ChatMessageRepository;
import com.taskflow.chat.repository.ChatRoomRepository;
import com.taskflow.common.exception.ForbiddenException;
import com.taskflow.common.exception.NotFoundException;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.project.service.ProjectAccessService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * All authorization lives here rather than being re-decided per route, so the REST controller and
 * the WebSocket handler — two different transports hitting the same operations — can't drift out
 * of sync the way the Node backend's REST route and Socket.io handler did for reaction-toggling.
 * Every method validates the caller against the room's project before touching data, closing the
 * IDOR gaps the Node backend's chat.js had (any tenant member could read/write any project's
 * rooms and messages by guessing an ID; any manager could modify/delete any other manager's room).
 */
@Service
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ProjectAccessService projectAccessService;

    public ChatService(
            ChatRoomRepository chatRoomRepository,
            ChatMessageRepository chatMessageRepository,
            ProjectAccessService projectAccessService) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.projectAccessService = projectAccessService;
    }

    public List<ChatRoom> listRooms(String projectId, UserPrincipal principal) {
        requireAccess(principal, projectId);
        return chatRoomRepository.findByProject(projectId);
    }

    public ChatRoom createRoom(String name, String projectId, List<String> memberIds, UserPrincipal principal) {
        requireManagerOrAdmin(principal, projectId);
        var members = new LinkedHashSet<String>();
        members.add(principal.id());
        if (memberIds != null) {
            members.addAll(memberIds);
        }
        ChatRoom room = ChatRoom.builder()
                .name(name).project(projectId).createdBy(principal.id())
                .members(new ArrayList<>(members)).build();
        return chatRoomRepository.save(room);
    }

    public ChatRoom addMember(String roomId, String userId, UserPrincipal principal) {
        ChatRoom room = getRoomOrThrow(roomId);
        requireManagerOrAdmin(principal, room.getProject());
        if (!room.getMembers().contains(userId)) {
            room.getMembers().add(userId);
        }
        return chatRoomRepository.save(room);
    }

    public ChatRoom removeMember(String roomId, String userId, UserPrincipal principal) {
        ChatRoom room = getRoomOrThrow(roomId);
        requireManagerOrAdmin(principal, room.getProject());
        room.getMembers().remove(userId);
        return chatRoomRepository.save(room);
    }

    public void deleteRoom(String roomId, UserPrincipal principal) {
        ChatRoom room = getRoomOrThrow(roomId);
        requireManagerOrAdmin(principal, room.getProject());
        chatRoomRepository.deleteById(roomId);
        chatMessageRepository.deleteByRoom(roomId);
    }

    public List<ChatMessage> listMessages(String roomId, UserPrincipal principal) {
        ChatRoom room = requireRoomAccess(roomId, principal);
        List<ChatMessage> latest = chatMessageRepository.findByRoomOrderByCreatedAtDesc(
                room.getId(), PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt")));
        return latest.reversed();
    }

    public ChatMessage sendMessage(String roomId, String text, List<String> mentions, UserPrincipal principal) {
        requireRoomAccess(roomId, principal);
        ChatMessage message = ChatMessage.builder()
                .room(roomId).sender(principal.id()).text(text)
                .mentions(mentions == null ? new ArrayList<>() : new ArrayList<>(mentions))
                .build();
        return chatMessageRepository.save(message);
    }

    public ChatMessage toggleReaction(String messageId, String emoji, UserPrincipal principal) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundException("Message not found"));
        requireRoomAccess(message.getRoom(), principal);

        Reaction existing = message.getReactions().stream()
                .filter(r -> r.getEmoji().equals(emoji)).findFirst().orElse(null);
        if (existing != null) {
            if (existing.getUsers().contains(principal.id())) {
                existing.getUsers().remove(principal.id());
            } else {
                existing.getUsers().add(principal.id());
            }
            if (existing.getUsers().isEmpty()) {
                message.getReactions().remove(existing);
            }
        } else {
            Reaction reaction = new Reaction(emoji, new ArrayList<>(List.of(principal.id())));
            message.getReactions().add(reaction);
        }
        return chatMessageRepository.save(message);
    }

    public ChatRoom getRoomOrThrow(String roomId) {
        return chatRoomRepository.findById(roomId).orElseThrow(() -> new NotFoundException("Room not found"));
    }

    /** Public entry point for callers (e.g. the typing-indicator WebSocket handler) that only need the access check. */
    public ChatRoom requireAccessibleRoom(String roomId, UserPrincipal principal) {
        return requireRoomAccess(roomId, principal);
    }

    private ChatRoom requireRoomAccess(String roomId, UserPrincipal principal) {
        ChatRoom room = getRoomOrThrow(roomId);
        requireAccess(principal, room.getProject());
        return room;
    }

    private void requireAccess(UserPrincipal principal, String projectId) {
        if (!projectAccessService.canAccess(principal.id(), principal.role(), projectId)) {
            throw new ForbiddenException("Access denied");
        }
    }

    private void requireManagerOrAdmin(UserPrincipal principal, String projectId) {
        if (!projectAccessService.isManagerOrAdmin(principal.id(), principal.role(), projectId)) {
            throw new ForbiddenException("Access denied");
        }
    }
}
