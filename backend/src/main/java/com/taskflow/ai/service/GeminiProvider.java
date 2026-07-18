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
public class GeminiProvider implements AiProvider {

    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AiResponseParser responseParser;

    public GeminiProvider(AiResponseParser responseParser) {
        this.responseParser = responseParser;
    }

    @Override
    public boolean supports(String model) {
        return model != null && model.toLowerCase().startsWith("gemini");
    }

    @Override
    public List<GeneratedTaskDto> generateTasks(String prompt, String apiKey, String model) {
        try {
            URI endpoint = URI.create(
                    "https://generativelanguage.googleapis.com/v1beta/models/" + model
                            + ":generateContent?key=" + apiKey);
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", responseParser.buildPrompt(prompt))))));
            HttpRequest request = HttpRequest.newBuilder(endpoint)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new AiGenerationException("Gemini request failed (HTTP " + response.statusCode() + ")");
            }
            JsonNode root = objectMapper.readTree(response.body());
            String content = root.path("candidates").path(0).path("content").path("parts").path(0)
                    .path("text").asText();
            return responseParser.parseTaskList(content);
        } catch (AiGenerationException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiGenerationException("Failed to reach Gemini: " + ex.getMessage());
        }
    }
}
