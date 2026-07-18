package com.taskflow.task.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Set;

/**
 * State pattern: each state owns the set of states it may transition into, so "what moves are
 * legal from here" lives in exactly one place instead of being scattered across {@code if}
 * chains. The Node backend allowed a developer to jump straight from {@code in-progress} to
 * {@code done}, skipping QA review entirely — structurally impossible here, since
 * {@link #IN_PROGRESS} only allows {@link #IN_QA}. (Managers/admins still override the structural
 * check — see {@code TaskWorkflowService} — the same oversight capability the Node backend had.)
 */
public enum TaskStatus {
    TODO("todo") {
        @Override
        public Set<TaskStatus> allowedNextStates() {
            return Set.of(IN_PROGRESS);
        }
    },
    IN_PROGRESS("in-progress") {
        @Override
        public Set<TaskStatus> allowedNextStates() {
            return Set.of(IN_QA);
        }
    },
    IN_QA("in-qa") {
        @Override
        public Set<TaskStatus> allowedNextStates() {
            return Set.of(DONE, IN_PROGRESS);
        }
    },
    DONE("done") {
        @Override
        public Set<TaskStatus> allowedNextStates() {
            return Set.of();
        }
    };

    private final String value;

    TaskStatus(String value) {
        this.value = value;
    }

    public abstract Set<TaskStatus> allowedNextStates();

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TaskStatus fromValue(String value) {
        for (TaskStatus status : values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown task status: " + value);
    }
}
