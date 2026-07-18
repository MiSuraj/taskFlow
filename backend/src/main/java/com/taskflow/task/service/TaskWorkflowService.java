package com.taskflow.task.service;

import com.taskflow.common.exception.ForbiddenException;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.task.domain.Task;
import com.taskflow.task.domain.TaskStatus;
import org.springframework.stereotype.Service;

/**
 * Actor-based rules layered on top of {@link TaskStatus}'s structural state machine: who may move
 * a task at all, and QA's extra restriction to only {@code done}/{@code in-progress}. Managers and
 * admins may override the structural transition table (e.g. force a task back to {@code todo} for
 * correction) — the same oversight capability the Node backend granted managers.
 */
@Service
public class TaskWorkflowService {

    public void validateTransition(Task task, TaskStatus target, UserPrincipal principal, boolean isProjectManager) {
        boolean isDevOwner = principal.id().equals(task.getAssignedTo());
        boolean isQaOwner = principal.id().equals(task.getQaAssignedTo());
        boolean isAdmin = "admin".equalsIgnoreCase(principal.role());
        boolean isManager = "manager".equalsIgnoreCase(principal.role()) && isProjectManager;

        if (!isDevOwner && !isQaOwner && !isManager && !isAdmin) {
            throw new ForbiddenException("Not authorized to move this task");
        }
        if ("qa".equalsIgnoreCase(principal.role()) && target != TaskStatus.DONE && target != TaskStatus.IN_PROGRESS) {
            throw new ForbiddenException("QA can only mark done or send back to in-progress");
        }

        boolean managerOverride = isManager || isAdmin;
        if (!managerOverride && !task.getStatus().allowedNextStates().contains(target)) {
            throw new ForbiddenException(
                    "Cannot move task from " + task.getStatus().getValue() + " to " + target.getValue());
        }
    }
}
