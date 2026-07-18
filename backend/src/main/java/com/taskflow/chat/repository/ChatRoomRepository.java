package com.taskflow.chat.repository;

import com.taskflow.chat.domain.ChatRoom;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatRoomRepository extends MongoRepository<ChatRoom, String> {
    List<ChatRoom> findByProject(String projectId);
}
