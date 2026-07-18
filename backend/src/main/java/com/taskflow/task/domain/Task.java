package com.taskflow.task.domain;

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
@Document(collection = "tasks")
public class Task {

    @Id
    private String id;

    private String title;
    private String description;
    private String type; // bug | feature | enhancement

    @Builder.Default
    private TaskStatus status = TaskStatus.TODO;

    private String project; // Project id
    private String createdBy; // User id
    private String assignedTo; // User id, nullable
    private String qaAssignedTo; // User id, nullable

    @Builder.Default
    private List<TimeLog> timeLogs = new ArrayList<>();

    @Builder.Default
    private List<Comment> comments = new ArrayList<>();

    @Builder.Default
    private long totalTime = 0; // seconds

    @Builder.Default
    private int rejectionCount = 0;

    private int queuePosition;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
