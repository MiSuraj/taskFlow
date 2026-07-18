package com.taskflow.platform.service;

import com.taskflow.common.exception.BadRequestException;
import com.taskflow.common.exception.NotFoundException;
import com.taskflow.platform.domain.Plan;
import com.taskflow.platform.domain.PlatformSettings;
import com.taskflow.platform.dto.PlanUpdateRequest;
import com.taskflow.platform.repository.PlatformSettingsRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Owns the pricing-plan catalog: seeds sane defaults on first use, lets the platform owner edit
 * individual fields per plan (name/price/features/AI+chat entitlements/payment-gateway IDs),
 * and is the single source of truth other services consult to enforce plan limits (AI/chat
 * enablement, max users) — mirroring {@code DEFAULT_PLANS} / {@code getPlatformSettings} in the
 * Node backend's tenants.js.
 */
@Service
public class PlanService {

    private static final String SETTINGS_KEY = "platform";

    private static final List<Plan> DEFAULT_PLANS = List.of(
            Plan.builder()
                    .key("basic").name("Basic").description("Core queue, boards, time logs")
                    .amount(499).currency("INR")
                    .features(List.of("Task queues & boards", "Time tracking", "Project docs",
                            "Manager dashboard", "Up to 5 users"))
                    .ai(false).externalChat(false).maxUsers(5).badge("").build(),
            Plan.builder()
                    .key("starter").name("Starter").description("Docs, chat, project management")
                    .amount(999).currency("INR")
                    .features(List.of("Everything in Basic", "Unlimited users",
                            "Project chat (internal)", "AI task generation"))
                    .ai(true).externalChat(false).maxUsers(null).badge("Popular").build(),
            Plan.builder()
                    .key("business").name("Business").description("AI add-ons + external chat bridges")
                    .amount(2499).currency("INR")
                    .features(List.of("Everything in Starter", "WhatsApp / Teams / Google Chat",
                            "External chat bridge", "Priority support"))
                    .ai(true).externalChat(true).maxUsers(null).badge("Best value").build(),
            Plan.builder()
                    .key("enterprise").name("Enterprise").description("Custom integrations and dedicated support")
                    .amount(9999).currency("INR")
                    .features(List.of("Everything in Business", "Custom integrations",
                            "Dedicated support", "SLA & invoicing"))
                    .ai(true).externalChat(true).maxUsers(null).badge("").contactOnly(true).build());

    private static final List<String> PLAN_ORDER = DEFAULT_PLANS.stream().map(Plan::getKey).toList();

    private final PlatformSettingsRepository platformSettingsRepository;

    public PlanService(PlatformSettingsRepository platformSettingsRepository) {
        this.platformSettingsRepository = platformSettingsRepository;
    }

    /** Loads (or seeds) settings, backfilling any plan fields missing from a saved-but-stale document. */
    public PlatformSettings loadSettings() {
        PlatformSettings settings = platformSettingsRepository.findByKey(SETTINGS_KEY)
                .orElseGet(() -> {
                    PlatformSettings created = new PlatformSettings();
                    created.setKey(SETTINGS_KEY);
                    created.setPlans(new ArrayList<>(clonePlans(DEFAULT_PLANS)));
                    return platformSettingsRepository.save(created);
                });

        Map<String, Plan> saved = new LinkedHashMap<>();
        for (Plan plan : settings.getPlans()) {
            saved.put(plan.getKey(), plan);
        }

        List<Plan> merged = new ArrayList<>();
        boolean needsBackfill = settings.getPlans().size() != DEFAULT_PLANS.size();
        for (Plan defaultPlan : DEFAULT_PLANS) {
            Plan existing = saved.get(defaultPlan.getKey());
            if (existing == null) {
                merged.add(clonePlan(defaultPlan));
                needsBackfill = true;
                continue;
            }
            if (existing.getDescription() == null || existing.getDescription().isBlank()) {
                existing.setDescription(defaultPlan.getDescription());
                needsBackfill = true;
            }
            if (existing.getFeatures() == null || existing.getFeatures().isEmpty()) {
                existing.setFeatures(new ArrayList<>(defaultPlan.getFeatures()));
                needsBackfill = true;
            }
            merged.add(existing);
        }

        if (needsBackfill) {
            settings.setPlans(merged);
            settings = platformSettingsRepository.save(settings);
        }
        return settings;
    }

    public List<Plan> getPlans() {
        List<Plan> plans = new ArrayList<>(loadSettings().getPlans());
        plans.sort((a, b) -> Integer.compare(PLAN_ORDER.indexOf(a.getKey()), PLAN_ORDER.indexOf(b.getKey())));
        return plans;
    }

    public Plan getPlan(String key) {
        return getPlans().stream().filter(p -> p.getKey().equals(key)).findFirst().orElse(null);
    }

    public Plan requirePlan(String key) {
        Plan plan = getPlan(key);
        if (plan == null) {
            throw new NotFoundException("Plan not found");
        }
        return plan;
    }

    public Plan updatePlan(String planKey, PlanUpdateRequest patch) {
        if (!PLAN_ORDER.contains(planKey)) {
            throw new NotFoundException("Plan not found");
        }
        if (patch.amount() != null && patch.amount() < 0) {
            throw new BadRequestException("Amount must be a valid positive number");
        }
        if (patch.name() != null && patch.name().isBlank()) {
            throw new BadRequestException("Plan name is required");
        }
        if (patch.maxUsers() != null && patch.maxUsers() < 1) {
            throw new BadRequestException("Max users must be empty or at least 1");
        }

        PlatformSettings settings = loadSettings();
        Plan plan = settings.getPlans().stream()
                .filter(p -> p.getKey().equals(planKey))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Plan not found"));

        if (patch.name() != null) plan.setName(truncate(patch.name().trim(), 80));
        if (patch.description() != null) plan.setDescription(truncate(patch.description().trim(), 180));
        if (patch.amount() != null) plan.setAmount(patch.amount());
        if (patch.currency() != null) plan.setCurrency(truncate(patch.currency().toUpperCase(), 3));
        if (patch.features() != null) {
            plan.setFeatures(patch.features().stream()
                    .map(String::trim).filter(s -> !s.isBlank()).limit(8).toList());
        }
        if (patch.ai() != null) plan.setAi(patch.ai());
        if (patch.externalChat() != null) plan.setExternalChat(patch.externalChat());
        plan.setMaxUsers(patch.maxUsers());
        if (patch.badge() != null) plan.setBadge(truncate(patch.badge().trim(), 40));
        if (patch.contactOnly() != null) plan.setContactOnly(patch.contactOnly());
        if (patch.stripeProductId() != null) plan.setStripeProductId(patch.stripeProductId().trim());
        if (patch.stripePriceId() != null) plan.setStripePriceId(patch.stripePriceId().trim());
        if (patch.razorpayPlanId() != null) plan.setRazorpayPlanId(patch.razorpayPlanId().trim());

        platformSettingsRepository.save(settings);
        return plan;
    }

    private static String truncate(String value, int max) {
        return value.length() > max ? value.substring(0, max) : value;
    }

    private static List<Plan> clonePlans(List<Plan> plans) {
        return plans.stream().map(PlanService::clonePlan).toList();
    }

    private static Plan clonePlan(Plan plan) {
        return plan.toBuilder().features(new ArrayList<>(plan.getFeatures())).build();
    }
}
