package com.taskflow.task.repository;

import com.taskflow.task.domain.Task;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskRepository extends MongoRepository<Task, String> {
    List<Task> findByProject(String projectId);

    List<Task> findByProjectIn(List<String> projectIds);

    long countByProjectAndStatusAndAssignedTo(String projectId, com.taskflow.task.domain.TaskStatus status, String assignedTo);
}
