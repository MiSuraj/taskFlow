package com.taskflow.platform.dto;

import java.time.Instant;

public record SubscriptionRequest(String plan, String status, Long amount, String currency, Instant currentPeriodEnd) {
}
