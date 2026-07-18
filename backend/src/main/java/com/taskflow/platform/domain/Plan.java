package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/** Embedded pricing-plan document inside {@link PlatformSettings}, editable by the platform owner. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class Plan {
    private String key;
    private String name;
    private String description;
    private long amount;
    private String currency;
    @Builder.Default
    private List<String> features = new ArrayList<>();
    private boolean ai;
    private boolean externalChat;
    private Integer maxUsers; // null == unlimited
    private String badge;
    private boolean contactOnly;
    private String stripeProductId;
    private String stripePriceId;
    private String razorpayPlanId;
}
