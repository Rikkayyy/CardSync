package com.cardsync.dto;

import java.util.List;

public record SpendSummaryResponse(
        double totalToday,
        double totalThisWeek,
        double totalThisMonth,
        String isoCurrencyCode,
        List<CategoryTotal> byCategoryThisMonth) {
}
