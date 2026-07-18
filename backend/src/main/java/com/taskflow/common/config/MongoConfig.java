package com.taskflow.common.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.taskflow.common.multitenancy.TenantAwareMongoDbFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;

/**
 * Two {@link MongoTemplate} beans back the whole application:
 *
 * <ul>
 *   <li>{@code primaryMongoTemplate} — a single, fixed "control-plane" database holding
 *       {@code Tenant}, {@code PlatformSettings} and {@code PlatformVisit} (platform-owner data).
 *   <li>{@code tenantMongoTemplate} — backed by {@link TenantAwareMongoDbFactory}, which resolves
 *       a different physical database per request based on {@code TenantContext}. Every tenant's
 *       users/projects/tasks/docs/chat live in their own database, exactly like the Node backend's
 *       {@code taskmanager_tenant_<slug>} databases.
 * </ul>
 *
 * Both share one {@link MongoClient}, so — unlike the Node backend, which opened a brand new
 * {@code mongoose.createConnection()} per tenant and never closed any of them — there is a single
 * connection pool for the whole cluster regardless of how many tenants exist.
 */
@Configuration
public class MongoConfig {

    @Bean
    public MongoClient mongoClient(@Value("${taskflow.mongo.uri}") String uri) {
        return MongoClients.create(uri);
    }

    @Bean(name = "primaryMongoDbFactory")
    public MongoDatabaseFactory primaryMongoDbFactory(
            MongoClient mongoClient,
            @Value("${taskflow.mongo.platform-database}") String platformDatabase) {
        return new SimpleMongoClientDatabaseFactory(mongoClient, platformDatabase);
    }

    @Bean(name = "primaryMongoTemplate")
    @Primary
    public MongoTemplate primaryMongoTemplate(@Qualifier("primaryMongoDbFactory") MongoDatabaseFactory factory) {
        return new MongoTemplate(factory);
    }

    @Bean(name = "tenantMongoDbFactory")
    public MongoDatabaseFactory tenantMongoDbFactory(
            MongoClient mongoClient,
            @Value("${taskflow.mongo.platform-database}") String platformDatabase) {
        // fallbackDatabaseName is never actually used for reads/writes (getMongoDatabase() is
        // overridden to require a tenant context) — it only satisfies the parent constructor.
        return new TenantAwareMongoDbFactory(mongoClient, platformDatabase);
    }

    @Bean(name = "tenantMongoTemplate")
    public MongoTemplate tenantMongoTemplate(@Qualifier("tenantMongoDbFactory") MongoDatabaseFactory factory) {
        return new MongoTemplate(factory);
    }
}
