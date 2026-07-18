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
@Document(collection = "chat_messages")
public class ChatMessage {

    @Id
    private String id;

    private String room;
    private String sender;
    private String text;

    @Builder.Default
    private List<String> mentions = new ArrayList<>();

    @Builder.Default
    private List<Reaction> reactions = new ArrayList<>();

    @Builder.Default
    private Instant createdAt = Instant.now();
}
