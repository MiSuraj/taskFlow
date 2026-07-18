package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TenantFeatures {
    private AiFeatureConfig ai = new AiFeatureConfig();
    private ChatIntegrationConfig chatIntegration = new ChatIntegrationConfig();
}
