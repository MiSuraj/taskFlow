package com.taskflow.ai.service;

import com.taskflow.common.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.List;

/** Picks the {@link AiProvider} strategy matching the tenant's configured model — new providers register themselves by existing. */
@Component
public class AiProviderResolver {

    private final List<AiProvider> providers;

    public AiProviderResolver(List<AiProvider> providers) {
        this.providers = providers;
    }

    public AiProvider resolve(String model) {
        return providers.stream()
                .filter(p -> p.supports(model))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Unsupported AI model: " + model));
    }
}
