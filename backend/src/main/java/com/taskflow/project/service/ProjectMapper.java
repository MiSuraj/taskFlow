package com.taskflow.project.service;

import com.taskflow.identity.dto.UserSummary;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.project.domain.Project;
import com.taskflow.project.dto.ProjectResponse;
import org.springframework.stereotype.Component;

@Component
public class ProjectMapper {

    private final UserRepository userRepository;

    public ProjectMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public ProjectResponse toResponse(Project project) {
        UserSummary manager = project.getManager() == null ? null
                : userRepository.findById(project.getManager()).map(UserSummary::from).orElse(null);
        UserSummary createdBy = project.getCreatedBy() == null ? null
                : userRepository.findById(project.getCreatedBy()).map(UserSummary::from).orElse(null);
        var members = project.getMembers() == null ? java.util.List.<UserSummary>of()
                : project.getMembers().stream()
                        .map(id -> userRepository.findById(id).map(UserSummary::from).orElse(null))
                        .filter(java.util.Objects::nonNull)
                        .toList();
        return new ProjectResponse(project.getId(), project.getName(), project.getDescription(),
                manager, members, createdBy, project.getCreatedAt());
    }
}
