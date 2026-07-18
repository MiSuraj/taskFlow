package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

/** Singleton document (key = "platform") holding the owner-editable pricing-plan catalog. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "platform_settings")
public class PlatformSettings {

    @Id
    private String id;

    @Indexed(unique = true)
    private String key;

    private List<Plan> plans = new ArrayList<>();
}
