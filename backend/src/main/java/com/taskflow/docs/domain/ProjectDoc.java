package com.taskflow.docs.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "project_docs")
public class ProjectDoc {

    @Id
    private String id;

    @Indexed(unique = true)
    private String project;

    @Builder.Default
    private List<DocSection> sections = new ArrayList<>();

    private String lastEditedBy; // User id
}
