package com.taskflow.project.web;

import com.taskflow.common.security.UserPrincipal;
import com.taskflow.project.domain.Project;
import com.taskflow.project.dto.AssignManagerRequest;
import com.taskflow.project.dto.CreateProjectRequest;
import com.taskflow.project.dto.MemberRequest;
import com.taskflow.project.dto.ProjectResponse;
import com.taskflow.project.service.ProjectMapper;
import com.taskflow.project.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectMapper projectMapper;

    public ProjectController(ProjectService projectService, ProjectMapper projectMapper) {
        this.projectService = projectService;
        this.projectMapper = projectMapper;
    }

    @GetMapping
    public List<ProjectResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return projectService.listForRequester(principal).stream().map(projectMapper::toResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProjectResponse> create(
            @Valid @RequestBody CreateProjectRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        Project project = projectService.create(request, principal.id());
        return ResponseEntity.status(201).body(projectMapper.toResponse(project));
    }

    @PatchMapping("/{id}/assign-manager")
    @PreAuthorize("hasRole('ADMIN')")
    public ProjectResponse assignManager(@PathVariable String id, @RequestBody AssignManagerRequest request) {
        return projectMapper.toResponse(projectService.assignManager(id, request.managerId()));
    }

    @PatchMapping("/{id}/members")
    @PreAuthorize("hasRole('MANAGER')")
    public ProjectResponse addMember(
            @PathVariable String id, @Valid @RequestBody MemberRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return projectMapper.toResponse(projectService.addMember(id, request.userId(), principal.id()));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ProjectResponse removeMember(
            @PathVariable String id, @PathVariable String userId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return projectMapper.toResponse(projectService.removeMember(id, userId, principal.id()));
    }
}
