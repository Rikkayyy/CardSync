package com.cardsync.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Per-IP fixed-window rate limit on /api/auth/**, to blunt credential-stuffing/brute-force
 * attempts against login and register. In-memory only -- fine for a single instance;
 * a multi-instance deployment would need a shared store (e.g. Redis) instead.
 */
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_ATTEMPTS = 10;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ConcurrentHashMap<String, Window> attemptsByIp = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (!request.getRequestURI().startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = clientIp(request);
        Window window = attemptsByIp.compute(ip, (key, existing) -> {
            Instant now = Instant.now();
            if (existing == null || existing.windowStart.plus(WINDOW).isBefore(now)) {
                return new Window(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (window.count.get() > MAX_ATTEMPTS) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Too many attempts. Try again in a minute.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        // Deliberately NOT trusting X-Forwarded-For: it's client-controllable unless a
        // reverse proxy in front is configured to strip/overwrite it, which isn't set up
        // yet. Trusting it blindly would let an attacker rotate the header value per
        // request and bypass this limiter entirely. Revisit once deployed behind an ALB
        // that's configured to set this header itself.
        return request.getRemoteAddr();
    }

    private static final class Window {
        final Instant windowStart;
        final AtomicInteger count = new AtomicInteger(1);

        Window(Instant windowStart) {
            this.windowStart = windowStart;
        }
    }
}
