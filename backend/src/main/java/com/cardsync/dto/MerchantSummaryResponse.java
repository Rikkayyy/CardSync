package com.cardsync.dto;

import java.util.UUID;

public record MerchantSummaryResponse(
        String normalizedMerchant,
        String displayName,
        String effectiveCategoryPrimary,
        long transactionCount,
        UUID groupId,
        String groupName,
        UUID memberId) {
}
