package com.cardsync.config;

import com.plaid.client.ApiClient;
import com.plaid.client.request.PlaidApi;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
@EnableConfigurationProperties(PlaidProperties.class)
public class PlaidConfig {

    @Bean
    public PlaidApi plaidApi(PlaidProperties properties) {
        ApiClient apiClient = new ApiClient(Map.of(
                "clientId", properties.clientId(),
                "secret", properties.secret()));
        apiClient.setPlaidAdapter("sandbox".equalsIgnoreCase(properties.env())
                ? ApiClient.Sandbox
                : ApiClient.Production);
        return apiClient.createService(PlaidApi.class);
    }
}
