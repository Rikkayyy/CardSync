package com.cardsync.dto;

import java.time.LocalDate;

public record TransactionResponse(
        String accountName,
        LocalDate date,
        LocalDate authorizedDate,
        String name,
        String merchantName,
        Double amount,
        String isoCurrencyCode,
        String categoryPrimary,
        String categoryDetailed,
        boolean pending,
        boolean isInternalTransfer) {
}
