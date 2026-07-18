package com.taskflow.task.dto;

import com.taskflow.task.domain.TimeLog;

import java.time.Instant;

public record TimeLogResponse(Instant startedAt, Instant endedAt, Long duration) {
    public static TimeLogResponse from(TimeLog log) {
        return new TimeLogResponse(log.getStartedAt(), log.getEndedAt(), log.getDuration());
    }
}
