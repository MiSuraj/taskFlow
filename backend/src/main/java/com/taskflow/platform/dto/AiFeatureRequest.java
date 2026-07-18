package com.taskflow.platform.dto;

public record AiFeatureRequest(Boolean enabled, String provider, String model, String apiKey) {
}
