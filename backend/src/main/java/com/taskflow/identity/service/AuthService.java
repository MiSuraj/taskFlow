package com.taskflow.identity.service;

import com.taskflow.common.exception.BadRequestException;
import com.taskflow.common.exception.ForbiddenException;
import com.taskflow.common.exception.NotFoundException;
import com.taskflow.common.exception.PaymentRequiredException;
import com.taskflow.common.multitenancy.TenantContext;
import com.taskflow.common.security.JwtService;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.identity.domain.User;
import com.taskflow.identity.dto.CreateUserRequest;
import com.taskflow.identity.dto.InviteUserRequest;
import com.taskflow.identity.dto.LoginRequest;
import com.taskflow.identity.dto.LoginResponse;
import com.taskflow.identity.dto.UserResponse;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.platform.domain.Tenant;
import com.taskflow.platform.repository.TenantRepository;
import com.taskflow.platform.service.TenantMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Authentication and user provisioning. Login runs before any tenant is attached to the request
 * (it IS how the tenant gets identified), so it resolves and validates the tenant itself —
 * mirroring the Node backend's login handler, which duplicated the same status/subscription
 * checks as {@code attachTenant} for the same reason.
 */
@Service
public class AuthService {

    private static final Set<String> ADMIN_ASSIGNABLE_ROLES = Set.of("manager", "developer", "qa");
    private static final Set<String> MANAGER_ASSIGNABLE_ROLES = Set.of("developer", "qa");
    private static final List<String> ACTIVE_SUBSCRIPTION_STATUSES = List.of("trial", "active");
    private static final String PLATFORM_TENANT_SLUG = "default";

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TenantMapper tenantMapper;

    public AuthService(
            TenantRepository tenantRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            TenantMapper tenantMapper) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tenantMapper = tenantMapper;
    }

    public LoginResponse login(LoginRequest request) {
        Tenant tenant = tenantRepository.findBySlug(request.tenantSlug().toLowerCase().trim())
                .orElseThrow(() -> new NotFoundException("Organization not found"));
        if (!"active".equals(tenant.getStatus())) {
            throw new ForbiddenException("Organization is suspended");
        }
        String subscriptionStatus = tenant.getSubscription() == null ? null : tenant.getSubscription().getStatus();
        if (!ACTIVE_SUBSCRIPTION_STATUSES.contains(subscriptionStatus)) {
            throw new PaymentRequiredException("Subscription is not active");
        }

        TenantContext.set(tenant);
        User user;
        try {
            user = userRepository.findByUsername(request.username())
                    .orElseThrow(() -> new BadRequestException("Invalid username or password"));
            if (!passwordEncoder.matches(request.password(), user.getPassword())) {
                throw new BadRequestException("Invalid username or password");
            }
        } finally {
            TenantContext.clear();
        }

        UserPrincipal principal = new UserPrincipal(user.getId(), user.getUsername(), user.getRole(),
                tenant.getId(), tenant.getSlug());
        String token = jwtService.issueToken(principal);
        return new LoginResponse(token, UserResponse.from(user), tenantMapper.toResponse(tenant, user.getRole()));
    }

    /** Admin-only provisioning: full base-role set, plus any tenant-defined custom role. */
    public User createUser(CreateUserRequest request) {
        Tenant tenant = requireNonPlatformTenant();
        String role = validateRole(request.role(), tenant, ADMIN_ASSIGNABLE_ROLES);
        return saveNewUser(request.username(), request.password(), role);
    }

    /**
     * Manager-only provisioning. The Node backend allowed a manager to invite a user with any
     * role string other than 'admin'/'manager' — including 'owner', a privilege-escalation path
     * inside the platform tenant. This applies the same allowlist as {@link #createUser}, minus
     * 'manager' itself (a manager cannot mint peer managers), closing that gap.
     */
    public User invite(InviteUserRequest request) {
        Tenant tenant = requireNonPlatformTenant();
        String role = validateRole(request.role(), tenant, MANAGER_ASSIGNABLE_ROLES);
        return saveNewUser(request.username(), request.password(), role);
    }

    private Tenant requireNonPlatformTenant() {
        Tenant tenant = TenantContext.get();
        if (PLATFORM_TENANT_SLUG.equals(tenant.getSlug())) {
            throw new ForbiddenException("Cannot create business users in the platform tenant");
        }
        return tenant;
    }

    private String validateRole(String requestedRole, Tenant tenant, Set<String> baseAllowedRoles) {
        if (requestedRole == null || requestedRole.isBlank()) {
            throw new BadRequestException("role is required");
        }
        String role = requestedRole.trim();
        String normalized = role.toLowerCase(Locale.ROOT);
        boolean isBaseRole = baseAllowedRoles.contains(normalized);
        boolean isCustomRole = tenant.getCustomRoles() != null
                && tenant.getCustomRoles().stream().anyMatch(r -> r.getName().equalsIgnoreCase(role));
        if (!isBaseRole && !isCustomRole) {
            throw new BadRequestException("Invalid role: " + role);
        }
        return isBaseRole ? normalized : role;
    }

    private User saveNewUser(String username, String password, String role) {
        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("Username already exists");
        }
        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .role(role)
                .build();
        return userRepository.save(user);
    }
}
