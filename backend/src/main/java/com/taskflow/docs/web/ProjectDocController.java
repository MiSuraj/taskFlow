package com.taskflow.docs.web;

import com.taskflow.common.exception.ForbiddenException;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.docs.dto.DocResponse;
import com.taskflow.docs.dto.DocSaveRequest;
import com.taskflow.docs.service.ProjectDocMapper;
import com.taskflow.docs.service.ProjectDocService;
import com.taskflow.project.service.ProjectAccessService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docs")
public class ProjectDocController {

    private final ProjectDocService projectDocService;
    private final ProjectDocMapper projectDocMapper;
    private final ProjectAccessService projectAccessService;

    public ProjectDocController(
            ProjectDocService projectDocService,
            ProjectDocMapper projectDocMapper,
            ProjectAccessService projectAccessService) {
        this.projectDocService = projectDocService;
        this.projectDocMapper = projectDocMapper;
        this.projectAccessService = projectAccessService;
    }

    @GetMapping("/{projectId}")
    public DocResponse get(@PathVariable String projectId, @AuthenticationPrincipal UserPrincipal principal) {
        requireAccess(principal, projectId);
        return projectDocMapper.toResponse(projectDocService.getOrCreate(projectId));
    }

    @PutMapping("/{projectId}")
    public DocResponse save(
            @PathVariable String projectId, @Valid @RequestBody DocSaveRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAccess(principal, projectId);
        return projectDocMapper.toResponse(projectDocService.save(projectId, request, principal.id()));
    }

    private void requireAccess(UserPrincipal principal, String projectId) {
        if (!projectAccessService.canAccess(principal.id(), principal.role(), projectId)) {
            throw new ForbiddenException("Access denied");
        }
    }
}
