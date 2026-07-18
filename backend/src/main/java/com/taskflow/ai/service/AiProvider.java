package com.taskflow.ai.service;

import com.taskflow.ai.dto.GeneratedTaskDto;

import java.util.List;

/**
 * Strategy interface: each supported AI vendor implements this once. {@link AiProviderResolver}
 * picks the implementation whose {@link #supports(String)} matches the tenant's configured model,
 * replacing the Node backend's {@code model.startsWith('gpt') ? ... : ...} branching with a
 * pluggable set of strategies — adding a new provider means adding a new {@code @Component}, not
 * editing an existing one.
 */
public interface AiProvider {

    boolean supports(String model);

    List<GeneratedTaskDto> generateTasks(String prompt, String apiKey, String model);
}
