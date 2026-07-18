package com.taskflow.platform.service;

import com.taskflow.common.exception.BadRequestException;
import com.taskflow.common.exception.ForbiddenException;
import com.taskflow.common.exception.NotFoundException;
import com.taskflow.common.exception.PaymentRequiredException;
import com.taskflow.common.multitenancy.TenantContext;
import com.taskflow.common.util.SlugUtil;
import com.taskflow.identity.domain.User;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.platform.domain.*;
import com.taskflow.platform.dto.*;
import com.taskflow.platform.repository.TenantRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

/**
 * Tenant lifecycle and admin-facing configuration: self-service registration (behind a mocked
 * payment step, same as the Node backend), branding, plan-enforced feature toggling, subscription
 * metadata, and custom roles.
 */
@Service
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PlanService planService;
    private final PasswordEncoder passwordEncoder;

    public TenantService(
            TenantRepository tenantRepository,
            UserRepository userRepository,
            PlanService planService,
            PasswordEncoder passwordEncoder) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.planService = planService;
        this.passwordEncoder = passwordEncoder;
    }

    public Tenant findBySlugOrThrow(String slug) {
        return tenantRepository.findBySlug(slug.toLowerCase().trim())
                .orElseThrow(() -> new NotFoundException("Organization not found"));
    }

    public Tenant register(RegisterOrganizationRequest request) {
        Plan selectedPlan = planService.getPlan(
                request.subscriptionPlan() == null ? "basic" : request.subscriptionPlan());
        if (selectedPlan == null) {
            throw new BadRequestException("Invalid subscription plan");
        }
        if (selectedPlan.isContactOnly()) {
            throw new PaymentRequiredException("This plan requires contacting sales");
        }
        MockPaymentRequest payment = request.mockPayment();
        if (payment == null || !payment.paid() || payment.paymentId() == null || payment.paymentId().isBlank()) {
            throw new PaymentRequiredException("Mock payment must be completed before organization setup");
        }

        String slug = SlugUtil.slugify(
                request.slug() != null && !request.slug().isBlank() ? request.slug() : request.organizationName());
        if (slug.isBlank()) {
            throw new BadRequestException("Organization slug is invalid");
        }
        if (tenantRepository.existsBySlug(slug)) {
            throw new BadRequestException("Organization slug already exists");
        }

        TenantFeatures normalized = normalizeFeatures(request.features());
        if (!selectedPlan.isAi()) normalized.getAi().setEnabled(false);
        if (!selectedPlan.isExternalChat()) normalized.getChatIntegration().setEnabled(false);

        List<CustomRole> customRoles = (request.customRoles() == null ? List.<CustomRoleRequest>of() : request.customRoles())
                .stream()
                .filter(r -> r.name() != null && !r.name().isBlank()
                        && !r.name().equalsIgnoreCase("admin") && !r.name().equalsIgnoreCase("manager"))
                .map(r -> new CustomRole(r.name(), r.color() == null ? "#6366f1" : r.color(), r.icon() == null ? "👤" : r.icon()))
                .toList();

        TenantBranding branding = new TenantBranding(
                request.logoUrl() == null ? "" : request.logoUrl(),
                request.primaryColor() == null ? "#2563eb" : request.primaryColor());

        TenantSubscription subscription = new TenantSubscription(
                request.subscriptionPlan() == null ? "basic" : request.subscriptionPlan(),
                "active",
                selectedPlan.getAmount(),
                selectedPlan.getCurrency(),
                Instant.now().plus(30, ChronoUnit.DAYS));

        Tenant tenant = Tenant.builder()
                .name(request.organizationName())
                .slug(slug)
                .dbName(SlugUtil.makeDbName(slug))
                .ownerEmail(request.ownerEmail())
                .status("active")
                .branding(branding)
                .features(normalized)
                .customRoles(new java.util.ArrayList<>(customRoles))
                .subscription(subscription)
                .build();
        tenant = tenantRepository.save(tenant);

        TenantContext.set(tenant);
        try {
            User admin = User.builder()
                    .username(request.username())
                    .password(passwordEncoder.encode(request.password()))
                    .role("admin")
                    .build();
            userRepository.save(admin);
        } finally {
            TenantContext.clear();
        }

        return tenant;
    }

    public Tenant updateBranding(BrandingRequest request) {
        Tenant tenant = TenantContext.get();
        if (request.logoUrl() != null) tenant.getBranding().setLogoUrl(request.logoUrl());
        if (request.primaryColor() != null) tenant.getBranding().setPrimaryColor(request.primaryColor());
        return tenantRepository.save(tenant);
    }

    public Tenant updateFeatures(FeaturesRequest request) {
        Tenant tenant = TenantContext.get();
        Plan plan = planService.getPlan(tenant.getSubscription().getPlan());
        if (plan == null) {
            throw new BadRequestException("Invalid plan on tenant");
        }
        TenantFeatures normalized = normalizeFeatures(request);
        if (!plan.isAi() && normalized.getAi().isEnabled()) {
            throw new ForbiddenException("AI task generation requires the Starter plan or above.");
        }
        if (!plan.isExternalChat() && normalized.getChatIntegration().isEnabled()) {
            throw new ForbiddenException("External chat (WhatsApp / Teams / Google Chat) requires the Business plan.");
        }
        tenant.setFeatures(normalized);
        return tenantRepository.save(tenant);
    }

    public Tenant updateSubscription(SubscriptionRequest request) {
        Tenant tenant = TenantContext.get();
        TenantSubscription subscription = tenant.getSubscription();
        if (request.plan() != null) subscription.setPlan(request.plan());
        if (request.status() != null) subscription.setStatus(request.status());
        if (request.amount() != null) subscription.setAmount(request.amount());
        if (request.currency() != null) subscription.setCurrency(request.currency());
        if (request.currentPeriodEnd() != null) subscription.setCurrentPeriodEnd(request.currentPeriodEnd());
        return tenantRepository.save(tenant);
    }

    public Tenant addCustomRole(CustomRoleRequest request) {
        Tenant tenant = TenantContext.get();
        if (request.name() == null || request.name().isBlank()) {
            throw new BadRequestException("Role name is required");
        }
        String slug = request.name().trim().toLowerCase(Locale.ROOT);
        if (slug.equals("admin") || slug.equals("manager")) {
            throw new BadRequestException("\"admin\" and \"manager\" are reserved roles");
        }
        boolean exists = tenant.getCustomRoles().stream().anyMatch(r -> r.getName().equalsIgnoreCase(slug));
        if (exists) {
            throw new BadRequestException("Role already exists");
        }
        tenant.getCustomRoles().add(new CustomRole(
                request.name().trim(),
                request.color() == null ? "#6366f1" : request.color(),
                request.icon() == null ? "👤" : request.icon()));
        return tenantRepository.save(tenant);
    }

    public Tenant removeCustomRole(String name) {
        Tenant tenant = TenantContext.get();
        tenant.getCustomRoles().removeIf(r -> r.getName().equalsIgnoreCase(name));
        return tenantRepository.save(tenant);
    }

    /** Mirrors the Node backend's normalizeFeatures(): only keeps sub-fields relevant to the active provider. */
    private TenantFeatures normalizeFeatures(FeaturesRequest request) {
        boolean aiEnabled = request != null && request.ai() != null && Boolean.TRUE.equals(request.ai().enabled());
        boolean chatEnabled = request != null && request.chatIntegration() != null
                && Boolean.TRUE.equals(request.chatIntegration().enabled());
        String chatProvider = chatEnabled && request.chatIntegration().provider() != null
                ? request.chatIntegration().provider() : "";

        AiFeatureConfig ai = new AiFeatureConfig();
        ai.setEnabled(aiEnabled);
        if (aiEnabled) {
            ai.setProvider(orEmpty(request.ai().provider()));
            ai.setModel(orEmpty(request.ai().model()));
            ai.setApiKey(orEmpty(request.ai().apiKey()));
        }

        ChatIntegrationConfig chat = new ChatIntegrationConfig();
        chat.setEnabled(chatEnabled);
        chat.setProvider(chatProvider);
        if ("whatsapp".equals(chatProvider) && request.chatIntegration().whatsapp() != null) {
            WhatsAppRequest w = request.chatIntegration().whatsapp();
            chat.setWhatsapp(new WhatsAppConfig(orEmpty(w.phoneNumberId()), orEmpty(w.businessAccountId()),
                    orEmpty(w.accessToken()), orEmpty(w.verifyToken())));
        }
        if ("google_chat".equals(chatProvider) && request.chatIntegration().googleChat() != null) {
            chat.setGoogleChat(new WebhookConfig(orEmpty(request.chatIntegration().googleChat().webhookUrl())));
        }
        if ("teams".equals(chatProvider) && request.chatIntegration().teams() != null) {
            chat.setTeams(new WebhookConfig(orEmpty(request.chatIntegration().teams().webhookUrl())));
        }

        return new TenantFeatures(ai, chat);
    }

    private String orEmpty(String value) {
        return value == null ? "" : value;
    }
}
