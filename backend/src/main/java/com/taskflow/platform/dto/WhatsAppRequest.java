package com.taskflow.platform.dto;

public record WhatsAppRequest(String phoneNumberId, String businessAccountId, String accessToken, String verifyToken) {
}
