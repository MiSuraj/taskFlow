package com.taskflow.chat.repository;

import com.taskflow.chat.domain.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {
    List<ChatMessage> findByRoomOrderByCreatedAtDesc(String room, Pageable pageable);

    void deleteByRoom(String room);
}
