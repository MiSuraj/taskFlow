package com.taskflow.docs.repository;

import com.taskflow.docs.domain.ProjectDoc;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ProjectDocRepository extends MongoRepository<ProjectDoc, String> {
    Optional<ProjectDoc> findByProject(String projectId);
}
