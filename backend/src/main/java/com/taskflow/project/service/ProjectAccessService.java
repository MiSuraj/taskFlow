package com.taskflow.project.service;

import com.taskflow.project.domain.Project;
import com.taskflow.project.repository.ProjectRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Single source of truth for "is this user allowed to touch this project's data" — used by every
 * module that hangs off a project (tasks, docs, chat). In the Node backend this check existed
 * correctly in only one route file ({@code docs.js}); {@code tasks.js} and {@code chat.js} each
 * had routes that skipped it entirely (IDOR: any tenant member could read/write any other
 * project's tasks or chat by guessing an ID). Centralizing it here means every module gets the
 * same rule for free instead of each service reimplementing — or forgetting to reimplement — it.
 */
@Service
public class ProjectAccessService {

    private final ProjectRepository projectRepository;

    public ProjectAccessService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public boolean canAccess(String userId, String userRole, String projectId) {
        if ("admin".equalsIgnoreCase(userRole)) {
            return true;
        }
        if (projectId == null || projectId.isBlank()) {
            return false;
        }
        Optional<Project> project = projectRepository.findById(projectId);
        if (project.isEmpty()) {
            return false;
        }
        Project p = project.get();
        return userId.equals(p.getManager()) || (p.getMembers() != null && p.getMembers().contains(userId));
    }

    /**
     * Stricter than {@link #canAccess}: only the project's own manager (or an admin), not any
     * member. Used for room/membership mutations — the Node backend let any manager in the
     * tenant modify or delete any other manager's project chat room; this closes that gap.
     */
    public boolean isManagerOrAdmin(String userId, String userRole, String projectId) {
        if ("admin".equalsIgnoreCase(userRole)) {
            return true;
        }
        if (projectId == null || projectId.isBlank()) {
            return false;
        }
        return projectRepository.findById(projectId)
                .map(p -> userId.equals(p.getManager()))
                .orElse(false);
    }
}
