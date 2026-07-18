package com.taskflow.task.service;

import com.taskflow.task.domain.Task;
import com.taskflow.task.domain.TimeLog;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Owns the "start/stop the clock" logic. The Node backend copy-pasted this exact
 * close-the-open-timelog sequence in both the status-change handler and the rejection-comment
 * handler; here it's one method both call.
 */
@Service
public class TaskTimeTrackingService {

    public void closeOpenTimeLog(Task task) {
        if (task.getTimeLogs().isEmpty()) {
            return;
        }
        TimeLog last = task.getTimeLogs().get(task.getTimeLogs().size() - 1);
        if (last.getEndedAt() == null) {
            Instant now = Instant.now();
            last.setEndedAt(now);
            long seconds = Duration.between(last.getStartedAt(), now).getSeconds();
            last.setDuration(seconds);
            task.setTotalTime(task.getTotalTime() + seconds);
        }
    }

    public void openTimeLog(Task task) {
        task.getTimeLogs().add(new TimeLog(Instant.now(), null, null));
    }
}
