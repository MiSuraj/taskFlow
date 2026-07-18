package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TenantSubscription {
    private String plan = "basic";
    private String status = "trial"; // trial | active | past_due | canceled
    private long amount;
    private String currency = "INR";
    private Instant currentPeriodEnd;
}
