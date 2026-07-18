package com.taskflow.ai.service;

import com.taskflow.ai.dto.AiStatusResponse;
import com.taskflow.ai.dto.GeneratedTaskDto;
import com.taskflow.common.exception.ForbiddenException;
import com.taskflow.common.multitenancy.TenantContext;
import com.taskflow.platform.domain.AiFeatureConfig;
import org.springframework.stereotype.Service;

import java.util.List;

/** Org-level AI configuration only — the API key/model are set once by the tenant admin, never supplied per-request by end users. */
@Service
public class AiTaskGenerationService {

    private final AiProviderResolver providerResolver;

    public AiTaskGenerationService(AiProviderResolver providerResolver) {
        this.providerResolver = providerResolver;
    }

    public List<GeneratedTaskDto> generateTasks(String prompt) {
        AiFeatureConfig ai = TenantContext.get().getFeatures().getAi();
        if (!ai.isEnabled() || ai.getApiKey() == null || ai.getApiKey().isBlank()) {
            throw new ForbiddenException("AI task generation is not configured for this organization");
        }
        return providerResolver.resolve(ai.getModel()).generateTasks(prompt, ai.getApiKey(), ai.getModel());
    }

    public AiStatusResponse status() {
        AiFeatureConfig ai = TenantContext.get().getFeatures().getAi();
        boolean keyConfigured = ai.getApiKey() != null && !ai.getApiKey().isBlank();
        return new AiStatusResponse(ai.isEnabled(), keyConfigured);
    }
}
