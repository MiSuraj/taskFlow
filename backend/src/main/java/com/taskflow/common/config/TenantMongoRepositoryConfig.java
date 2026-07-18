package com.taskflow.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Repositories in these packages are resolved against whichever tenant database is current on
 * {@code TenantContext} for the thread handling the request — see
 * {@link com.taskflow.common.multitenancy.TenantAwareMongoDbFactory}.
 */
@Configuration
@EnableMongoRepositories(
        basePackages = {
                "com.taskflow.identity.repository",
                "com.taskflow.project.repository",
                "com.taskflow.task.repository",
                "com.taskflow.docs.repository",
                "com.taskflow.chat.repository"
        },
        mongoTemplateRef = "tenantMongoTemplate")
public class TenantMongoRepositoryConfig {
}
