package com.taskflow.task.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TimeLog {
    private Instant startedAt;
    private Instant endedAt;
    private Long duration; // seconds
}
