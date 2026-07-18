package com.taskflow.platform.web;

import com.taskflow.platform.domain.Tenant;
import com.taskflow.platform.dto.RegisterOrganizationRequest;
import com.taskflow.platform.service.PlanService;
import com.taskflow.platform.service.PlatformVisitService;
import com.taskflow.platform.service.TenantMapper;
import com.taskflow.platform.service.TenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Unauthenticated endpoints: org lookup for branding, the public plan catalog, visit tracking, self-service signup. */
@RestController
@RequestMapping("/api/tenants")
public class PublicTenantController {

    private final TenantService tenantService;
    private final PlanService planService;
    private final PlatformVisitService platformVisitService;
    private final TenantMapper tenantMapper;

    public PublicTenantController(
            TenantService tenantService,
            PlanService planService,
            PlatformVisitService platformVisitService,
            TenantMapper tenantMapper) {
        this.tenantService = tenantService;
        this.planService = planService;
        this.platformVisitService = platformVisitService;
        this.tenantMapper = tenantMapper;
    }

    @GetMapping("/public/{slug}")
    public ResponseEntity<Map<String, Object>> getPublicTenant(@PathVariable String slug) {
        Tenant tenant = tenantService.findBySlugOrThrow(slug);
        return ResponseEntity.ok(Map.of("tenant", tenantMapper.toResponse(tenant, null)));
    }

    @GetMapping("/plans")
    public ResponseEntity<Map<String, Object>> getPlans() {
        return ResponseEntity.ok(Map.of("plans", planService.getPlans()));
    }

    @PostMapping("/track-visit")
    public ResponseEntity<Map<String, Object>> trackVisit(
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Object visitorId = body.get("visitorId");
        Object path = body.getOrDefault("path", "/");
        platformVisitService.trackVisit(
                visitorId == null ? null : visitorId.toString(),
                path.toString(),
                request.getHeader("User-Agent"),
                request.getRemoteAddr());
        return ResponseEntity.status(201).body(Map.of("ok", true));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterOrganizationRequest request) {
        Tenant tenant = tenantService.register(request);
        return ResponseEntity.status(201).body(Map.of("tenant", tenantMapper.toResponse(tenant, "admin")));
    }
}
