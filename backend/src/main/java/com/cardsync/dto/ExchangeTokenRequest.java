package com.cardsync.dto;

import jakarta.validation.constraints.NotBlank;

public record ExchangeTokenRequest(
        @NotBlank String publicToken, String institutionId, String institutionName) {
}
