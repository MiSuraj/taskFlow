package com.taskflow.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/** Issues and verifies the same JWT shape the Node backend used: sub/username/role/tenantId/tenantSlug. */
@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(
            @Value("${taskflow.jwt.secret}") String secret,
            @Value("${taskflow.jwt.expiration-minutes}") long expirationMinutes) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("taskflow.jwt.secret (JWT_SECRET env var) must be set");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    public String issueToken(UserPrincipal principal) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(principal.id())
                .claim("username", principal.username())
                .claim("role", principal.role())
                .claim("tenantId", principal.tenantId())
                .claim("tenantSlug", principal.tenantSlug())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(expirationMinutes))))
                .signWith(key)
                .compact();
    }

    public UserPrincipal parse(String token) throws JwtException {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new UserPrincipal(
                claims.getSubject(),
                claims.get("username", String.class),
                claims.get("role", String.class),
                claims.get("tenantId", String.class),
                claims.get("tenantSlug", String.class));
    }
}
