package com.taskflow.common.security;

import java.security.Principal;

/** The STOMP session's authenticated identity, set on CONNECT and reused for every later frame on that session. */
public record WsPrincipal(UserPrincipal user, String tenantSlug) implements Principal {
    @Override
    public String getName() {
        return user.id();
    }
}
