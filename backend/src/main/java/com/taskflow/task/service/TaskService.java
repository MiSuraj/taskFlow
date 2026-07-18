package com.taskflow.task.service;

import com.taskflow.common.exception.BadRequestException;
import com.taskflow.common.exception.ForbiddenException;
import com.taskflow.common.exception.NotFoundException;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.project.domain.Project;
import com.taskflow.project.repository.ProjectRepository;
import com.taskflow.project.service.ProjectAccessService;
import com.taskflow.task.domain.Comment;
import com.taskflow.task.domain.Task;
import com.taskflow.task.domain.TaskStatus;
import com.taskflow.task.dto.CommentRequest;
import com.taskflow.task.dto.CreateTaskRequest;
import com.taskflow.task.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectAccessService projectAccessService;
    private final TaskWorkflowService taskWorkflowService;
    private final TaskTimeTrackingService taskTimeTrackingService;

    public TaskService(
            TaskRepository taskRepository,
            ProjectRepository projectRepository,
            ProjectAccessService projectAccessService,
            TaskWorkflowService taskWorkflowService,
            TaskTimeTrackingService taskTimeTrackingService) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.projectAccessService = projectAccessService;
        this.taskWorkflowService = taskWorkflowService;
        this.taskTimeTrackingService = taskTimeTrackingService;
    }

    public List<Task> list(UserPrincipal principal, String projectId) {
        if (projectId != null && !projectId.isBlank()) {
            requireAccess(principal, projectId);
            return taskRepository.findByProject(projectId);
        }
        if ("admin".equalsIgnoreCase(principal.role())) {
            return taskRepository.findAll();
        }
        List<String> projectIds = ("manager".equalsIgnoreCase(principal.role())
                ? projectRepository.findByManager(principal.id())
                : projectRepository.findByMembers(principal.id()))
                .stream().map(Project::getId).toList();
        return taskRepository.findByProjectIn(projectIds);
    }

    public Task getByIdOrThrow(String id) {
        return taskRepository.findById(id).orElseThrow(() -> new NotFoundException("Task not found"));
    }

    public Task create(CreateTaskRequest request, UserPrincipal principal) {
        requireAccess(principal, request.projectId());
        long queuePosition = taskRepository.countByProjectAndStatusAndAssignedTo(
                request.projectId(), TaskStatus.TODO, null);
        Task task = Task.builder()
                .title(request.title())
                .description(request.description())
                .type(request.type())
                .project(request.projectId())
                .createdBy(principal.id())
                .queuePosition((int) queuePosition)
                .build();
        return taskRepository.save(task);
    }

    public Task pick(String taskId, UserPrincipal principal) {
        Task task = getByIdOrThrow(taskId);
        requireAccess(principal, task.getProject());
        if (task.getAssignedTo() != null) {
            throw new BadRequestException("Task already picked");
        }
        task.setAssignedTo(principal.id());
        task.setStatus(TaskStatus.IN_PROGRESS);
        taskTimeTrackingService.openTimeLog(task);
        return taskRepository.save(task);
    }

    public Task qaPick(String taskId, UserPrincipal principal) {
        Task task = getByIdOrThrow(taskId);
        requireAccess(principal, task.getProject());
        if (task.getStatus() != TaskStatus.IN_QA) {
            throw new BadRequestException("Task is not in QA");
        }
        if (task.getQaAssignedTo() != null) {
            throw new BadRequestException("Task already picked by QA");
        }
        task.setQaAssignedTo(principal.id());
        return taskRepository.save(task);
    }

    public Task assign(String taskId, String userId, UserPrincipal principal) {
        Task task = getByIdOrThrow(taskId);
        requireAccess(principal, task.getProject());
        if (task.getAssignedTo() != null) {
            throw new BadRequestException("Task already assigned");
        }
        task.setAssignedTo(userId);
        task.setStatus(TaskStatus.IN_PROGRESS);
        taskTimeTrackingService.openTimeLog(task);
        return taskRepository.save(task);
    }

    public Task changeStatus(String taskId, TaskStatus target, UserPrincipal principal) {
        Task task = getByIdOrThrow(taskId);
        requireAccess(principal, task.getProject());
        boolean isProjectManager = isManagerOfProject(task.getProject(), principal.id());
        taskWorkflowService.validateTransition(task, target, principal, isProjectManager);

        if (task.getStatus() == TaskStatus.IN_PROGRESS && target != TaskStatus.IN_PROGRESS) {
            taskTimeTrackingService.closeOpenTimeLog(task);
        }
        if (target == TaskStatus.IN_PROGRESS && task.getStatus() != TaskStatus.IN_PROGRESS) {
            taskTimeTrackingService.openTimeLog(task);
        }
        if (target == TaskStatus.IN_PROGRESS) {
            task.setQaAssignedTo(null);
        }
        task.setStatus(target);
        return taskRepository.save(task);
    }

    public Task addComment(String taskId, CommentRequest request, UserPrincipal principal) {
        Task task = getByIdOrThrow(taskId);
        requireAccess(principal, task.getProject());
        boolean isRejection = Boolean.TRUE.equals(request.isRejection());

        task.getComments().add(Comment.builder()
                .text(request.text().trim())
                .author(principal.id())
                .isRejection(isRejection)
                .createdAt(Instant.now())
                .build());

        if (isRejection) {
            task.setRejectionCount(task.getRejectionCount() + 1);
            if (task.getStatus() == TaskStatus.IN_PROGRESS) {
                taskTimeTrackingService.closeOpenTimeLog(task);
            }
            task.setStatus(TaskStatus.IN_PROGRESS);
            task.setQaAssignedTo(null);
            taskTimeTrackingService.openTimeLog(task);
        }

        return taskRepository.save(task);
    }

    public void delete(String taskId, UserPrincipal principal) {
        Task task = getByIdOrThrow(taskId);
        requireAccess(principal, task.getProject());
        taskRepository.deleteById(taskId);
    }

    private void requireAccess(UserPrincipal principal, String projectId) {
        if (!projectAccessService.canAccess(principal.id(), principal.role(), projectId)) {
            throw new ForbiddenException("Access denied");
        }
    }

    private boolean isManagerOfProject(String projectId, String userId) {
        return projectRepository.findById(projectId)
                .map(project -> userId.equals(project.getManager()))
                .orElse(false);
    }
}
