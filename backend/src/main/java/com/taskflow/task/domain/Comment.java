package com.taskflow.task.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {
    private String text;
    private String author; // User id
    private boolean isRejection;
    @Builder.Default
    private Instant createdAt = Instant.now();
}
