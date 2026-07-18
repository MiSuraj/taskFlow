package com.taskflow.common.security;

import com.taskflow.common.multitenancy.TenantContext;
import com.taskflow.platform.domain.Tenant;
import org.springframework.stereotype.Component;

/**
 * Bean referenced from {@code @PreAuthorize("hasRole('OWNER') and @tenantGuard.isDefaultTenant()")}.
 * The platform owner is not a per-tenant role — mirroring the Node backend's {@code requireOwner}
 * middleware, it only exists inside the reserved bootstrap tenant (slug {@code default}).
 */
@Component("tenantGuard")
public class TenantGuard {

    public static final String PLATFORM_TENANT_SLUG = "default";

    public boolean isDefaultTenant() {
        Tenant tenant = TenantContext.get();
        return tenant != null && PLATFORM_TENANT_SLUG.equals(tenant.getSlug());
    }
}
