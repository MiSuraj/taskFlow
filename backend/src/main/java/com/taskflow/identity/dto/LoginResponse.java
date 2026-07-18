package com.taskflow.identity.dto;

import java.util.Map;

public record LoginResponse(String token, UserResponse user, Map<String, Object> tenant) {
}
