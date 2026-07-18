package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatIntegrationConfig {
    private boolean enabled;
    private String provider = ""; // whatsapp | google_chat | teams
    private WhatsAppConfig whatsapp = new WhatsAppConfig();
    private WebhookConfig googleChat = new WebhookConfig();
    private WebhookConfig teams = new WebhookConfig();
}
