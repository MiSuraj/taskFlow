package com.taskflow.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.ai.dto.GeneratedTaskDto;
import com.taskflow.common.exception.AiGenerationException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Shared by every {@link AiProvider}: models don't reliably return bare JSON, so pull the first JSON array out of free text. */
@Component
public class AiResponseParser {

    private static final Pattern JSON_ARRAY = Pattern.compile("\\[.*]", Pattern.DOTALL);

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<GeneratedTaskDto> parseTaskList(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            throw new AiGenerationException("AI provider returned an empty response");
        }
        Matcher matcher = JSON_ARRAY.matcher(rawText);
        if (!matcher.find()) {
            throw new AiGenerationException("Could not find a task list in the AI provider's response");
        }
        try {
            return List.of(objectMapper.readValue(matcher.group(), GeneratedTaskDto[].class));
        } catch (Exception ex) {
            throw new AiGenerationException("Failed to parse AI provider's task list: " + ex.getMessage());
        }
    }

    public String buildPrompt(String userPrompt) {
        return "You are a project planning assistant. Based on the following description, generate a list of "
                + "actionable software development tasks. Respond with ONLY a JSON array, no prose, no markdown "
                + "fences, where each element has exactly these fields: \"title\" (string), \"description\" "
                + "(string), \"type\" (one of \"bug\", \"feature\", \"enhancement\"). Description:\n\n" + userPrompt;
    }
}
