package com.cardsync.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "plaid")
public record PlaidProperties(String clientId, String secret, String env) {
}
