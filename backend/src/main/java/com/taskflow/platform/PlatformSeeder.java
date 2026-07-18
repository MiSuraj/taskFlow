package com.taskflow.platform;

import com.taskflow.common.multitenancy.TenantContext;
import com.taskflow.common.util.SlugUtil;
import com.taskflow.identity.domain.User;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.platform.domain.Tenant;
import com.taskflow.platform.domain.TenantSubscription;
import com.taskflow.platform.repository.TenantRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Single seeding entry point. The Node backend had this same "seed the default org if the
 * platform DB is empty" logic duplicated between {@code seed.js} (a standalone script) and
 * {@code server.js}'s {@code seedIfEmpty()} (run on every boot) — with subtly different behavior
 * between the two (the boot-time version force-reset the admin's role to 'owner' every restart,
 * the script version didn't). One implementation, run once at startup, is the whole fix.
 */
@Component
public class PlatformSeeder implements CommandLineRunner {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;
    private final String defaultSlug;
    private final String defaultUsername;
    private final String defaultPassword;

    public PlatformSeeder(
            TenantRepository tenantRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${taskflow.seed.enabled}") boolean enabled,
            @Value("${taskflow.seed.default-tenant-slug}") String defaultSlug,
            @Value("${taskflow.seed.default-admin-username}") String defaultUsername,
            @Value("${taskflow.seed.default-admin-password}") String defaultPassword) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
        this.defaultSlug = defaultSlug;
        this.defaultUsername = defaultUsername;
        this.defaultPassword = defaultPassword;
    }

    @Override
    public void run(String... args) {
        if (!enabled || !tenantRepository.findAll().isEmpty()) {
            return;
        }

        Tenant tenant = Tenant.builder()
                .name("Platform")
                .slug(defaultSlug)
                .dbName(SlugUtil.makeDbName(defaultSlug))
                .status("active")
                .subscription(new TenantSubscription(
                        "enterprise", "active", 0, "INR", Instant.now().plus(3650, ChronoUnit.DAYS)))
                .build();
        tenant = tenantRepository.save(tenant);

        TenantContext.set(tenant);
        try {
            User owner = User.builder()
                    .username(defaultUsername)
                    .password(passwordEncoder.encode(defaultPassword))
                    .role("owner")
                    .build();
            userRepository.save(owner);
        } finally {
            TenantContext.clear();
        }
    }
}
