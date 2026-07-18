package com.taskflow.platform.service;

import com.taskflow.platform.domain.Tenant;
import com.taskflow.platform.repository.TenantRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Aggregates tenant + visit data into the platform owner's dashboard payload. */
@Service
public class PlatformOwnerStatsService {

    private final TenantRepository tenantRepository;
    private final PlatformVisitService platformVisitService;
    private final PlanService planService;

    public PlatformOwnerStatsService(
            TenantRepository tenantRepository,
            PlatformVisitService platformVisitService,
            PlanService planService) {
        this.tenantRepository = tenantRepository;
        this.platformVisitService = platformVisitService;
        this.planService = planService;
    }

    public Map<String, Object> buildStats() {
        List<Tenant> allTenants = tenantRepository.findAllByOrderByCreatedAtDesc();
        List<Tenant> customerTenants = allTenants.stream()
                .filter(t -> !"default".equals(t.getSlug()))
                .toList();

        Instant monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant todayStart = LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant();

        long totalVisits = platformVisitService.countAll();
        long visitsThisMonth = platformVisitService.countSince(monthStart);
        long visitsToday = platformVisitService.countSince(todayStart);
        long uniqueVisitors = platformVisitService.countDistinctVisitors();
        long uniqueVisitorsThisMonth = platformVisitService.countDistinctVisitorsSince(monthStart);

        List<Map<String, Object>> summaries = customerTenants.stream().map(t -> {
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("id", t.getId());
            summary.put("name", t.getName());
            summary.put("slug", t.getSlug());
            summary.put("status", t.getStatus());
            summary.put("ownerEmail", t.getOwnerEmail());
            summary.put("createdAt", t.getCreatedAt());
            summary.put("subscription", t.getSubscription());
            return summary;
        }).toList();

        Map<String, Long> planBreakdown = customerTenants.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getSubscription() == null || t.getSubscription().getPlan() == null
                                ? "unknown" : t.getSubscription().getPlan(),
                        Collectors.counting()));

        Map<String, Long> subscriptionStatus = customerTenants.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getSubscription() == null || t.getSubscription().getStatus() == null
                                ? "unknown" : t.getSubscription().getStatus(),
                        Collectors.counting()));

        long activeOrganizations = customerTenants.stream().filter(t -> "active".equals(t.getStatus())).count();
        long suspendedOrganizations = customerTenants.stream().filter(t -> "suspended".equals(t.getStatus())).count();
        long subscribedOrganizations = customerTenants.stream()
                .filter(t -> t.getSubscription() != null && "active".equals(t.getSubscription().getStatus())).count();
        long trialOrganizations = customerTenants.stream()
                .filter(t -> t.getSubscription() != null && "trial".equals(t.getSubscription().getStatus())).count();
        long joinedThisMonth = customerTenants.stream()
                .filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isBefore(monthStart)).count();
        long monthlyRevenue = customerTenants.stream()
                .filter(t -> t.getSubscription() != null && "active".equals(t.getSubscription().getStatus()))
                .mapToLong(t -> t.getSubscription().getAmount())
                .sum();

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("organizations", customerTenants.size());
        totals.put("allTenants", allTenants.size());
        totals.put("activeOrganizations", activeOrganizations);
        totals.put("suspendedOrganizations", suspendedOrganizations);
        totals.put("subscribedOrganizations", subscribedOrganizations);
        totals.put("trialOrganizations", trialOrganizations);
        totals.put("joinedThisMonth", joinedThisMonth);
        totals.put("totalVisits", totalVisits);
        totals.put("visitsThisMonth", visitsThisMonth);
        totals.put("visitsToday", visitsToday);
        totals.put("uniqueVisitors", uniqueVisitors);
        totals.put("uniqueVisitorsThisMonth", uniqueVisitorsThisMonth);
        totals.put("monthlyRevenue", monthlyRevenue);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totals", totals);
        response.put("plans", planService.getPlans());
        response.put("planBreakdown", planBreakdown);
        response.put("subscriptionStatus", subscriptionStatus);
        response.put("recentOrganizations", summaries.stream().limit(8).toList());
        response.put("organizations", summaries);
        return response;
    }
}
