package com.taskflow.task.dto;

import com.taskflow.task.domain.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record StatusChangeRequest(@NotNull TaskStatus status) {
}
