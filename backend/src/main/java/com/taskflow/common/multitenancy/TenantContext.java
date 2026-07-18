package com.taskflow.common.multitenancy;

import com.taskflow.platform.domain.Tenant;

/**
 * Holds the resolved {@link Tenant} for the thread handling the current request (or STOMP frame).
 * Set by {@code TenantResolvingFilter} / the WebSocket channel interceptor after authentication,
 * read by {@link TenantAwareMongoDbFactory} to pick the right physical database, and read by
 * services that need the tenant's branding/subscription/features. Must always be cleared in a
 * {@code finally} block — Tomcat/WebSocket threads are pooled and reused across requests.
 */
public final class TenantContext {

    private static final ThreadLocal<Tenant> CURRENT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void set(Tenant tenant) {
        CURRENT.set(tenant);
    }

    public static Tenant get() {
        return CURRENT.get();
    }

    public static String getDbName() {
        Tenant tenant = CURRENT.get();
        return tenant == null ? null : tenant.getDbName();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
