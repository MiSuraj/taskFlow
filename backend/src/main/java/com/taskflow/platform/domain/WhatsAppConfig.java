package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppConfig {
    private String phoneNumberId = "";
    private String businessAccountId = "";
    private String accessToken = "";
    private String verifyToken = "";
}
