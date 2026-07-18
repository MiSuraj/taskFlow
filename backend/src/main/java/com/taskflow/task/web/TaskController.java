package com.taskflow.task.web;

import com.taskflow.common.security.UserPrincipal;
import com.taskflow.task.domain.Task;
import com.taskflow.task.dto.*;
import com.taskflow.task.service.TaskMapper;
import com.taskflow.task.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;
    private final TaskMapper taskMapper;

    public TaskController(TaskService taskService, TaskMapper taskMapper) {
        this.taskService = taskService;
        this.taskMapper = taskMapper;
    }

    @GetMapping
    public List<TaskResponse> list(
            @RequestParam(required = false) String projectId, @AuthenticationPrincipal UserPrincipal principal) {
        return taskService.list(principal, projectId).stream().map(taskMapper::toResponse).toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('DEVELOPER') or hasRole('MANAGER')")
    public ResponseEntity<TaskResponse> create(
            @Valid @RequestBody CreateTaskRequest request, @AuthenticationPrincipal UserPrincipal principal) {
        Task task = taskService.create(request, principal);
        return ResponseEntity.status(201).body(taskMapper.toResponse(task));
    }

    @PatchMapping("/{id}/pick")
    @PreAuthorize("hasRole('DEVELOPER') or hasRole('MANAGER')")
    public TaskResponse pick(@PathVariable String id, @AuthenticationPrincipal UserPrincipal principal) {
        return taskMapper.toResponse(taskService.pick(id, principal));
    }

    @PatchMapping("/{id}/qa-pick")
    @PreAuthorize("hasRole('QA') or hasRole('MANAGER')")
    public TaskResponse qaPick(@PathVariable String id, @AuthenticationPrincipal UserPrincipal principal) {
        return taskMapper.toResponse(taskService.qaPick(id, principal));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('MANAGER')")
    public TaskResponse assign(
            @PathVariable String id, @Valid @RequestBody AssignRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return taskMapper.toResponse(taskService.assign(id, request.userId(), principal));
    }

    @PatchMapping("/{id}/status")
    public TaskResponse changeStatus(
            @PathVariable String id, @Valid @RequestBody StatusChangeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return taskMapper.toResponse(taskService.changeStatus(id, request.status(), principal));
    }

    @PostMapping("/{id}/comments")
    public TaskResponse addComment(
            @PathVariable String id, @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return taskMapper.toResponse(taskService.addComment(id, request, principal));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or hasRole('QA')")
    public Map<String, String> delete(@PathVariable String id, @AuthenticationPrincipal UserPrincipal principal) {
        taskService.delete(id, principal);
        return Map.of("message", "Deleted");
    }
}
