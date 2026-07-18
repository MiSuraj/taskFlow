package com.taskflow.chat.web;

import com.taskflow.chat.dto.*;
import com.taskflow.chat.service.ChatMapper;
import com.taskflow.chat.service.ChatService;
import com.taskflow.common.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final ChatMapper chatMapper;

    public ChatController(ChatService chatService, ChatMapper chatMapper) {
        this.chatService = chatService;
        this.chatMapper = chatMapper;
    }

    @GetMapping("/rooms/{projectId}")
    public List<ChatRoomResponse> listRooms(
            @PathVariable String projectId, @AuthenticationPrincipal UserPrincipal principal) {
        return chatService.listRooms(projectId, principal).stream().map(chatMapper::toResponse).toList();
    }

    @PostMapping("/rooms")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ChatRoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        var room = chatService.createRoom(request.name(), request.projectId(), request.memberIds(), principal);
        return ResponseEntity.status(201).body(chatMapper.toResponse(room));
    }

    @PatchMapping("/rooms/{id}/members")
    @PreAuthorize("hasRole('MANAGER')")
    public ChatRoomResponse addMember(
            @PathVariable String id, @Valid @RequestBody RoomMemberRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return chatMapper.toResponse(chatService.addMember(id, request.userId(), principal));
    }

    @DeleteMapping("/rooms/{id}/members/{userId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ChatRoomResponse removeMember(
            @PathVariable String id, @PathVariable String userId, @AuthenticationPrincipal UserPrincipal principal) {
        return chatMapper.toResponse(chatService.removeMember(id, userId, principal));
    }

    @DeleteMapping("/rooms/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public Map<String, String> deleteRoom(@PathVariable String id, @AuthenticationPrincipal UserPrincipal principal) {
        chatService.deleteRoom(id, principal);
        return Map.of("message", "Room deleted");
    }

    @GetMapping("/messages/{roomId}")
    public List<ChatMessageResponse> listMessages(
            @PathVariable String roomId, @AuthenticationPrincipal UserPrincipal principal) {
        return chatService.listMessages(roomId, principal).stream().map(chatMapper::toResponse).toList();
    }

    @PatchMapping("/messages/{id}/react")
    public ChatMessageResponse react(
            @PathVariable String id, @Valid @RequestBody ReactionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return chatMapper.toResponse(chatService.toggleReaction(id, request.emoji(), principal));
    }
}
