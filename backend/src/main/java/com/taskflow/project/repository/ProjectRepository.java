package com.taskflow.project.repository;

import com.taskflow.project.domain.Project;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByManager(String managerId);

    /** Spring Data matches this against array-field membership: {members: userId}. */
    List<Project> findByMembers(String userId);
}
