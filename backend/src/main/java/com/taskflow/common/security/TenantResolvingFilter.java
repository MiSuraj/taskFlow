package com.taskflow.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.common.multitenancy.TenantContext;
import com.taskflow.platform.domain.Tenant;
import com.taskflow.platform.repository.TenantRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Runs after {@link JwtAuthenticationFilter}. For every authenticated request it re-loads the
 * tenant by slug from the control-plane database and re-checks status/subscription — on every
 * request, not just at login — exactly like the Node backend's {@code attachTenant} middleware.
 * A forged/stale JWT claiming a suspended tenant or a slug that no longer exists is rejected here
 * regardless of what the token itself says. Unauthenticated (public) requests pass through
 * untouched, since they have no tenant to resolve.
 */
@Component
public class TenantResolvingFilter extends OncePerRequestFilter {

    private static final List<String> ACTIVE_SUBSCRIPTION_STATUSES = List.of("trial", "active");

    private final TenantRepository tenantRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TenantResolvingFilter(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!(authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof UserPrincipal principal)) {
            filterChain.doFilter(request, response);
            return;
        }

        String slug = principal.tenantSlug() == null ? null : principal.tenantSlug().toLowerCase().trim();
        Optional<Tenant> tenantOpt = slug == null ? Optional.empty() : tenantRepository.findBySlug(slug);
        if (tenantOpt.isEmpty()) {
            writeError(response, HttpServletResponse.SC_NOT_FOUND, "Organization not found");
            return;
        }
        Tenant tenant = tenantOpt.get();
        if (!"active".equals(tenant.getStatus())) {
            writeError(response, HttpServletResponse.SC_FORBIDDEN, "Organization is suspended");
            return;
        }
        String subscriptionStatus = tenant.getSubscription() == null ? null : tenant.getSubscription().getStatus();
        if (!ACTIVE_SUBSCRIPTION_STATUSES.contains(subscriptionStatus)) {
            writeError(response, 402, "Subscription is not active");
            return;
        }

        TenantContext.set(tenant);
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), Map.of("message", message));
    }
}
