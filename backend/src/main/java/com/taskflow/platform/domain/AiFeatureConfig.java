package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiFeatureConfig {
    private boolean enabled;
    private String provider = "";
    private String model = "";
    private String apiKey = "";
}
