package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/** One row per landing-page hit, feeding the platform owner's analytics tab. Unauthenticated writes. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "platform_visits")
public class PlatformVisit {

    @Id
    private String id;

    private String visitorId;
    private String path;
    private String userAgent;
    private String ip;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
