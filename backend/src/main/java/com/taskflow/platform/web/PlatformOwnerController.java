package com.taskflow.platform.web;

import com.taskflow.platform.domain.Plan;
import com.taskflow.platform.dto.PlanUpdateRequest;
import com.taskflow.platform.service.PlanService;
import com.taskflow.platform.service.PlatformOwnerStatsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Platform-owner-only console. {@code hasRole('OWNER')} alone is not enough — the owner role is
 * not a per-tenant role, it only exists inside the reserved {@code default} bootstrap tenant, so
 * every route here also checks {@code @tenantGuard.isDefaultTenant()} (mirrors the Node backend's
 * {@code requireOwner} middleware).
 */
@RestController
@RequestMapping("/api/tenants/owner")
@PreAuthorize("hasRole('OWNER') and @tenantGuard.isDefaultTenant()")
public class PlatformOwnerController {

    private final PlatformOwnerStatsService platformOwnerStatsService;
    private final PlanService planService;

    public PlatformOwnerController(PlatformOwnerStatsService platformOwnerStatsService, PlanService planService) {
        this.platformOwnerStatsService = platformOwnerStatsService;
        this.planService = planService;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return platformOwnerStatsService.buildStats();
    }

    @PatchMapping("/plans/{planKey}")
    public Map<String, Object> updatePlan(@PathVariable String planKey, @RequestBody PlanUpdateRequest request) {
        planService.updatePlan(planKey, request);
        return Map.of("plans", planService.getPlans());
    }
}
