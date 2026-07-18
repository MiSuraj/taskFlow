package com.taskflow.platform.service;

import com.taskflow.platform.domain.AiFeatureConfig;
import com.taskflow.platform.domain.ChatIntegrationConfig;
import com.taskflow.platform.domain.Tenant;
import com.taskflow.platform.domain.TenantFeatures;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Maps {@link Tenant} to the JSON shape returned by the API. Non-admin callers (and the fully
 * public {@code /tenants/public/:slug} lookup) never see raw secret values — AI provider API keys
 * or WhatsApp/Teams tokens — only a {@code *Configured} boolean. This closes what was originally
 * an unauthenticated secret-leak in the Node backend (any tenant member, or literally anyone who
 * knew an org's slug, could read the org's paid API key and webhook tokens in full); only the
 * tenant admin — who is the only one with a UI to manage these integrations — gets the real values,
 * matching what the admin-only AI/chat config form actually needs to pre-fill and round-trip.
 */
@Component
public class TenantMapper {

    public Map<String, Object> toResponse(Tenant tenant, String requesterRole) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", tenant.getId());
        payload.put("name", tenant.getName());
        payload.put("slug", tenant.getSlug());
        payload.put("status", tenant.getStatus());
        payload.put("subscription", tenant.getSubscription());
        payload.put("branding", tenant.getBranding());
        payload.put("features", "admin".equalsIgnoreCase(requesterRole)
                ? tenant.getFeatures()
                : maskFeatures(tenant.getFeatures()));
        payload.put("customRoles", tenant.getCustomRoles() == null ? List.of() : tenant.getCustomRoles());
        return payload;
    }

    private Map<String, Object> maskFeatures(TenantFeatures features) {
        AiFeatureConfig ai = features.getAi();
        Map<String, Object> aiView = new LinkedHashMap<>();
        aiView.put("enabled", ai.isEnabled());
        aiView.put("provider", ai.isEnabled() ? ai.getProvider() : "");
        aiView.put("model", ai.isEnabled() ? ai.getModel() : "");
        aiView.put("apiKeyConfigured", isPresent(ai.getApiKey()));

        ChatIntegrationConfig chat = features.getChatIntegration();
        String provider = chat.isEnabled() ? chat.getProvider() : "";
        Map<String, Object> chatView = new LinkedHashMap<>();
        chatView.put("enabled", chat.isEnabled());
        chatView.put("provider", provider);
        chatView.put("whatsapp", "whatsapp".equals(provider) ? Map.of(
                "phoneNumberId", chat.getWhatsapp().getPhoneNumberId(),
                "businessAccountId", chat.getWhatsapp().getBusinessAccountId(),
                "accessTokenConfigured", isPresent(chat.getWhatsapp().getAccessToken()),
                "verifyTokenConfigured", isPresent(chat.getWhatsapp().getVerifyToken())
        ) : Map.of());
        chatView.put("googleChat", "google_chat".equals(provider)
                ? Map.of("webhookUrlConfigured", isPresent(chat.getGoogleChat().getWebhookUrl())) : Map.of());
        chatView.put("teams", "teams".equals(provider)
                ? Map.of("webhookUrlConfigured", isPresent(chat.getTeams().getWebhookUrl())) : Map.of());

        Map<String, Object> masked = new LinkedHashMap<>();
        masked.put("ai", aiView);
        masked.put("chatIntegration", chatView);
        return masked;
    }

    private boolean isPresent(String value) {
        return value != null && !value.isBlank();
    }
}
