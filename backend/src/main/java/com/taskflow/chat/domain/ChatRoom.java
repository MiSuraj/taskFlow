package com.taskflow.chat.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "chat_rooms")
public class ChatRoom {

    @Id
    private String id;

    private String name;
    private String project;
    private String createdBy;

    @Builder.Default
    private List<String> members = new ArrayList<>();

    @Builder.Default
    private Instant createdAt = Instant.now();
}
