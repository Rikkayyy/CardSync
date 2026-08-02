package com.cardsync.dto;

import java.time.LocalDate;

public record TransactionResponse(
        String accountName,
        LocalDate date,
        String name,
        String merchantName,
        Double amount,
        String isoCurrencyCode,
        String category,
        boolean pending) {
}
