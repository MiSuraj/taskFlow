package com.taskflow.platform.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Control-plane record for one customer organization. Lives in the platform database; every other
 * piece of tenant data (users/projects/tasks/docs/chat) lives in the tenant's own database named
 * by {@link #dbName}, resolved dynamically per-request — see
 * {@code com.taskflow.common.multitenancy.TenantAwareMongoDbFactory}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "tenants")
public class Tenant {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String slug;

    @Indexed(unique = true)
    private String dbName;

    private String ownerEmail;

    @Builder.Default
    private String status = "active"; // active | suspended

    @Builder.Default
    private TenantSubscription subscription = new TenantSubscription();

    @Builder.Default
    private TenantBranding branding = new TenantBranding();

    @Builder.Default
    private TenantFeatures features = new TenantFeatures();

    @Builder.Default
    @Field("customRoles")
    private List<CustomRole> customRoles = new ArrayList<>();

    @Builder.Default
    private Instant createdAt = Instant.now();
}
