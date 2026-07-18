package com.taskflow.platform.dto;

public record ChatIntegrationRequest(
        Boolean enabled,
        String provider,
        WhatsAppRequest whatsapp,
        WebhookRequest googleChat,
        WebhookRequest teams
) {
}
