package com.taskflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * Mongo autoconfiguration is excluded because {@link com.taskflow.common.config.MongoConfig}
 * defines the primary (control-plane) and tenant-scoped {@code MongoTemplate} beans explicitly —
 * letting autoconfiguration also register a default one would create an ambiguous/duplicate bean.
 * UserDetailsServiceAutoConfiguration is excluded because auth is entirely JWT-based
 * ({@code JwtAuthenticationFilter} populates the SecurityContext directly) — without this
 * exclusion Boot generates a throwaway in-memory user/password on every startup that nothing
 * ever uses.
 */
@SpringBootApplication(exclude = {
        MongoAutoConfiguration.class,
        MongoDataAutoConfiguration.class,
        UserDetailsServiceAutoConfiguration.class
})
public class TaskflowApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskflowApplication.class, args);
    }
}
