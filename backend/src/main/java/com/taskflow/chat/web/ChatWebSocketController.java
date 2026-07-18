package com.taskflow.chat.web;

import com.taskflow.chat.dto.ChatMessageResponse;
import com.taskflow.chat.dto.ReactionRequest;
import com.taskflow.chat.dto.SendMessageRequest;
import com.taskflow.chat.dto.TypingMessage;
import com.taskflow.chat.dto.TypingRequest;
import com.taskflow.chat.service.ChatMapper;
import com.taskflow.chat.service.ChatService;
import com.taskflow.common.security.WsPrincipal;
import com.taskflow.identity.dto.UserSummary;
import com.taskflow.identity.repository.UserRepository;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * STOMP counterpart to socket.io's join-chat/chat-message/chat-react/typing events (join/leave
 * are SUBSCRIBE/UNSUBSCRIBE to the room topic, same as the docs handler). All authorization is
 * delegated to {@code ChatService}, which the REST controller also calls — one set of rules for
 * both transports.
 */
@Controller
public class ChatWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatService chatService;
    private final ChatMapper chatMapper;
    private final UserRepository userRepository;

    public ChatWebSocketController(
            SimpMessagingTemplate messagingTemplate,
            ChatService chatService,
            ChatMapper chatMapper,
            UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatService = chatService;
        this.chatMapper = chatMapper;
        this.userRepository = userRepository;
    }

    @MessageMapping("/chat/{roomId}/message")
    public void sendMessage(@DestinationVariable String roomId, SendMessageRequest request, Principal principal) {
        WsPrincipal wsPrincipal = (WsPrincipal) principal;
        var message = chatService.sendMessage(roomId, request.text(), request.mentions(), wsPrincipal.user());
        ChatMessageResponse response = chatMapper.toResponse(message);
        messagingTemplate.convertAndSend(chatTopic(wsPrincipal.tenantSlug(), roomId), response);
    }

    @MessageMapping("/chat/{roomId}/messages/{messageId}/react")
    public void react(
            @DestinationVariable String roomId, @DestinationVariable String messageId,
            ReactionRequest request, Principal principal) {
        WsPrincipal wsPrincipal = (WsPrincipal) principal;
        var message = chatService.toggleReaction(messageId, request.emoji(), wsPrincipal.user());
        messagingTemplate.convertAndSend(chatTopic(wsPrincipal.tenantSlug(), roomId), chatMapper.toResponse(message));
    }

    @MessageMapping("/chat/{roomId}/typing")
    public void typing(@DestinationVariable String roomId, TypingRequest request, Principal principal) {
        WsPrincipal wsPrincipal = (WsPrincipal) principal;
        chatService.requireAccessibleRoom(roomId, wsPrincipal.user());
        UserSummary user = userRepository.findById(wsPrincipal.user().id()).map(UserSummary::from).orElse(null);
        messagingTemplate.convertAndSend(
                chatTopic(wsPrincipal.tenantSlug(), roomId) + ".typing", new TypingMessage(user, request.typing()));
    }

    private String chatTopic(String tenantSlug, String roomId) {
        return "/topic/tenant." + tenantSlug + ".chat." + roomId;
    }
}
