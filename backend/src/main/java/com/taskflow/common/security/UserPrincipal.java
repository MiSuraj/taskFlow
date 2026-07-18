package com.taskflow.common.security;

/** The JWT-derived identity of the caller, set as the Spring Security authentication principal. */
public record UserPrincipal(
        String id,
        String username,
        String role,
        String tenantId,
        String tenantSlug
) {
}
