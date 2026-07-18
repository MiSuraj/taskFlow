package com.taskflow.task.service;

import com.taskflow.identity.dto.UserSummary;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.project.repository.ProjectRepository;
import com.taskflow.task.domain.Task;
import com.taskflow.task.dto.*;
import org.springframework.stereotype.Component;

@Component
public class TaskMapper {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    public TaskMapper(UserRepository userRepository, ProjectRepository projectRepository) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
    }

    public TaskResponse toResponse(Task task) {
        ProjectSummary project = projectRepository.findById(task.getProject())
                .map(p -> new ProjectSummary(p.getId(), p.getName()))
                .orElse(null);
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getType(),
                task.getStatus(),
                project,
                resolveUser(task.getCreatedBy()),
                resolveUser(task.getAssignedTo()),
                resolveUser(task.getQaAssignedTo()),
                task.getTimeLogs().stream().map(TimeLogResponse::from).toList(),
                task.getComments().stream()
                        .map(c -> new CommentResponse(c.getText(), resolveUser(c.getAuthor()), c.isRejection(), c.getCreatedAt()))
                        .toList(),
                task.getTotalTime(),
                task.getRejectionCount(),
                task.getQueuePosition(),
                task.getCreatedAt());
    }

    private UserSummary resolveUser(String userId) {
        return userId == null ? null : userRepository.findById(userId).map(UserSummary::from).orElse(null);
    }
}
