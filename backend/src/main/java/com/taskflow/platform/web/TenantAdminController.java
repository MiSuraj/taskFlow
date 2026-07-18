package com.taskflow.platform.web;

import com.taskflow.common.multitenancy.TenantContext;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.platform.domain.Tenant;
import com.taskflow.platform.dto.BrandingRequest;
import com.taskflow.platform.dto.CustomRoleRequest;
import com.taskflow.platform.dto.FeaturesRequest;
import com.taskflow.platform.dto.SubscriptionRequest;
import com.taskflow.platform.service.TenantMapper;
import com.taskflow.platform.service.TenantService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Tenant-scoped admin console: branding, plan-enforced feature toggling, subscription, custom roles. */
@RestController
@RequestMapping("/api/tenants")
public class TenantAdminController {

    private final TenantService tenantService;
    private final TenantMapper tenantMapper;

    public TenantAdminController(TenantService tenantService, TenantMapper tenantMapper) {
        this.tenantService = tenantService;
        this.tenantMapper = tenantMapper;
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("tenant", tenantMapper.toResponse(TenantContext.get(), principal.role()));
    }

    @PatchMapping("/branding")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> updateBranding(@RequestBody BrandingRequest request) {
        Tenant tenant = tenantService.updateBranding(request);
        return Map.of("tenant", tenantMapper.toResponse(tenant, "admin"));
    }

    @PatchMapping("/features")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> updateFeatures(@RequestBody FeaturesRequest request) {
        Tenant tenant = tenantService.updateFeatures(request);
        return Map.of("tenant", tenantMapper.toResponse(tenant, "admin"));
    }

    @PatchMapping("/subscription")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> updateSubscription(@RequestBody SubscriptionRequest request) {
        Tenant tenant = tenantService.updateSubscription(request);
        return Map.of("tenant", tenantMapper.toResponse(tenant, "admin"));
    }

    @GetMapping("/roles")
    public Map<String, Object> listRoles() {
        Tenant tenant = TenantContext.get();
        return Map.of("customRoles", tenant.getCustomRoles() == null ? List.of() : tenant.getCustomRoles());
    }

    @PostMapping("/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> addRole(@RequestBody CustomRoleRequest request) {
        Tenant tenant = tenantService.addCustomRole(request);
        return Map.of("tenant", tenantMapper.toResponse(tenant, "admin"));
    }

    @DeleteMapping("/roles/{name}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> removeRole(@PathVariable String name) {
        Tenant tenant = tenantService.removeCustomRole(name);
        return Map.of("tenant", tenantMapper.toResponse(tenant, "admin"));
    }
}
