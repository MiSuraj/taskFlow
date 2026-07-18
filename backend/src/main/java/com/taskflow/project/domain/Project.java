package com.taskflow.project.domain;

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
@Document(collection = "projects")
public class Project {

    @Id
    private String id;

    private String name;
    private String description;

    private String manager; // User id, nullable until assigned

    @Builder.Default
    private List<String> members = new ArrayList<>();

    private String createdBy; // User id

    @Builder.Default
    private Instant createdAt = Instant.now();
}
