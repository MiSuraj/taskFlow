package com.taskflow.platform.dto;

import java.util.List;

/**
 * Partial update for one plan. Every field is nullable and applied only when present — same
 * semantics as the Node backend's {@code if (field !== undefined) ...} handling — except
 * {@code maxUsers}, which the owner console always includes in full-plan-edit saves (a number or
 * {@code null} for "unlimited"), so it is applied unconditionally.
 */
public record PlanUpdateRequest(
        String name,
        String description,
        Long amount,
        String currency,
        List<String> features,
        Boolean ai,
        Boolean externalChat,
        Integer maxUsers,
        String badge,
        Boolean contactOnly,
        String stripeProductId,
        String stripePriceId,
        String razorpayPlanId
) {
}
