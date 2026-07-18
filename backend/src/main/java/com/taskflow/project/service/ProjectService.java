package com.taskflow.project.service;

import com.taskflow.common.exception.BadRequestException;
import com.taskflow.common.exception.NotFoundException;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.project.domain.Project;
import com.taskflow.project.dto.CreateProjectRequest;
import com.taskflow.project.repository.ProjectRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public List<Project> listForRequester(UserPrincipal principal) {
        if ("admin".equalsIgnoreCase(principal.role())) {
            return projectRepository.findAll();
        }
        if ("manager".equalsIgnoreCase(principal.role())) {
            return projectRepository.findByManager(principal.id());
        }
        return projectRepository.findByMembers(principal.id());
    }

    public Project getByIdOrThrow(String id) {
        return projectRepository.findById(id).orElseThrow(() -> new NotFoundException("Project not found"));
    }

    public Project create(CreateProjectRequest request, String creatorId) {
        Project project = Project.builder()
                .name(request.name())
                .description(request.description())
                .createdBy(creatorId)
                .build();
        return projectRepository.save(project);
    }

    public Project assignManager(String projectId, String managerId) {
        Project project = getByIdOrThrow(projectId);
        project.setManager(managerId);
        return projectRepository.save(project);
    }

    public Project addMember(String projectId, String userId, String requesterManagerId) {
        Project project = requireOwnedByManager(projectId, requesterManagerId);
        if (project.getMembers().contains(userId)) {
            throw new BadRequestException("User already in project");
        }
        project.getMembers().add(userId);
        return projectRepository.save(project);
    }

    public Project removeMember(String projectId, String userId, String requesterManagerId) {
        Project project = requireOwnedByManager(projectId, requesterManagerId);
        project.getMembers().remove(userId);
        return projectRepository.save(project);
    }

    private Project requireOwnedByManager(String projectId, String requesterManagerId) {
        Project project = getByIdOrThrow(projectId);
        if (!requesterManagerId.equals(project.getManager())) {
            throw new NotFoundException("Project not found");
        }
        return project;
    }
}
