package com.taskflow.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/** Repositories in {@code platform.repository} always read/write the control-plane database. */
@Configuration
@EnableMongoRepositories(
        basePackages = "com.taskflow.platform.repository",
        mongoTemplateRef = "primaryMongoTemplate")
public class PrimaryMongoRepositoryConfig {
}
