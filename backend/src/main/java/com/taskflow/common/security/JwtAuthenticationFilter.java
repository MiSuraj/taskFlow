package com.taskflow.common.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Authenticates requests carrying {@code Authorization: Bearer <jwt>}. On a missing/invalid token
 * the SecurityContext is simply left unauthenticated — Spring Security's entry point (configured in
 * {@code SecurityConfig}) rejects the request later only if the matched route actually requires
 * authentication, so public routes still work with no/garbage tokens.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    // The Node backend's requireRole() treats 'admin' as an implicit pass for every role-gated
    // route unless explicitly excluded. Granting admins these authorities too reproduces that
    // behavior via plain hasRole(...) checks instead of a bespoke SpEL/annotation per route.
    private static final Set<String> BASE_BUSINESS_ROLES = Set.of("manager", "developer", "qa");

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                UserPrincipal principal = jwtService.parse(token);
                var authToken = new UsernamePasswordAuthenticationToken(
                        principal, token, authoritiesFor(principal.role()));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } catch (JwtException | IllegalArgumentException ex) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private List<GrantedAuthority> authoritiesFor(String role) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        if (role == null || role.isBlank()) {
            return authorities;
        }
        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
        if ("admin".equalsIgnoreCase(role)) {
            for (String base : BASE_BUSINESS_ROLES) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + base.toUpperCase()));
            }
        }
        return authorities;
    }
}
