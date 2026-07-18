package com.taskflow.common.security;

import com.taskflow.common.multitenancy.TenantContext;
import com.taskflow.platform.domain.Tenant;
import com.taskflow.platform.repository.TenantRepository;
import com.taskflow.project.service.ProjectAccessService;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * JWT authentication and per-message tenant resolution for the STOMP/WebSocket transport, doing
 * for the realtime chat/docs traffic what {@code JwtAuthenticationFilter} + {@code
 * TenantResolvingFilter} do for HTTP. Two gaps this closes relative to the Node backend's
 * Socket.io setup: (1) Node authenticated once at handshake and never re-checked tenant
 * status/subscription for the life of the connection — a suspended tenant's users could keep
 * chatting/editing docs in realtime for up to 7 days; here every single frame re-validates.
 * (2) subscribing to a project's collaborative-doc topic is access-checked here, closing the
 * IDOR gap the Node backend had on {@code join-doc}.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final List<String> ACTIVE_SUBSCRIPTION_STATUSES = List.of("trial", "active");
    private static final Pattern DOC_TOPIC = Pattern.compile("^/topic/tenant\\.[^.]+\\.doc\\.([^.]+)$");

    private final JwtService jwtService;
    private final TenantRepository tenantRepository;
    private final ProjectAccessService projectAccessService;

    public StompAuthChannelInterceptor(
            JwtService jwtService, TenantRepository tenantRepository, ProjectAccessService projectAccessService) {
        this.jwtService = jwtService;
        this.tenantRepository = tenantRepository;
        this.projectAccessService = projectAccessService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticate(accessor);
        }

        Principal user = accessor.getUser();
        if (user instanceof WsPrincipal wsPrincipal) {
            Tenant tenant = loadActiveTenant(wsPrincipal.tenantSlug());
            TenantContext.set(tenant);

            if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                enforceSubscriptionAccess(accessor.getDestination(), wsPrincipal);
            }
        }
        return message;
    }

    @Override
    public void afterSendCompletion(
            @NonNull Message<?> message, @NonNull MessageChannel channel, boolean sent, Exception ex) {
        TenantContext.clear();
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessagingException("Missing Authorization header");
        }
        UserPrincipal principal;
        try {
            principal = jwtService.parse(header.substring(7));
        } catch (Exception ex) {
            throw new MessagingException("Invalid or expired token");
        }
        // Validate once at connect too, so a bad token/tenant never even establishes a session.
        loadActiveTenant(principal.tenantSlug());
        accessor.setUser(new WsPrincipal(principal, principal.tenantSlug().toLowerCase().trim()));
    }

    private Tenant loadActiveTenant(String slug) {
        Tenant tenant = tenantRepository.findBySlug(slug)
                .orElseThrow(() -> new MessagingException("Organization not found"));
        if (!"active".equals(tenant.getStatus())) {
            throw new MessagingException("Organization is suspended");
        }
        String subscriptionStatus = tenant.getSubscription() == null ? null : tenant.getSubscription().getStatus();
        if (!ACTIVE_SUBSCRIPTION_STATUSES.contains(subscriptionStatus)) {
            throw new MessagingException("Subscription is not active");
        }
        return tenant;
    }

    private void enforceSubscriptionAccess(String destination, WsPrincipal principal) {
        if (destination == null) {
            return;
        }
        Matcher docMatcher = DOC_TOPIC.matcher(destination);
        if (docMatcher.matches()) {
            String projectId = docMatcher.group(1);
            if (!projectAccessService.canAccess(principal.user().id(), principal.user().role(), projectId)) {
                throw new MessagingException("Access denied");
            }
        }
    }
}
