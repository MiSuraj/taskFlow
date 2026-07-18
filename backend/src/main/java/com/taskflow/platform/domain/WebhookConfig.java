package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Shared shape for the Google Chat and Teams incoming-webhook integrations. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebhookConfig {
    private String webhookUrl = "";
}
