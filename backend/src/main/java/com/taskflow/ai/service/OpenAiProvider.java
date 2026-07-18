package com.taskflow.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.ai.dto.GeneratedTaskDto;
import com.taskflow.common.exception.AiGenerationException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class OpenAiProvider implements AiProvider {

    private static final URI ENDPOINT = URI.create("https://api.openai.com/v1/chat/completions");

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AiResponseParser responseParser;

    public OpenAiProvider(AiResponseParser responseParser) {
        this.responseParser = responseParser;
    }

    @Override
    public boolean supports(String model) {
        return model != null && model.toLowerCase().startsWith("gpt");
    }

    @Override
    public List<GeneratedTaskDto> generateTasks(String prompt, String apiKey, String model) {
        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "temperature", 0.7,
                    "messages", List.of(Map.of("role", "user", "content", responseParser.buildPrompt(prompt))));
            HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new AiGenerationException("OpenAI request failed (HTTP " + response.statusCode() + ")");
            }
            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("choices").path(0).path("message").path("content").asText();
            return responseParser.parseTaskList(content);
        } catch (AiGenerationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiGenerationException("Failed to reach OpenAI: " + ex.getMessage());
        }
    }
}
