package com.cardsync.service;

import java.util.Map;

/**
 * Resolves the display category for a transaction: a user's custom CategoryGroup
 * assignment (merchant-level, then category-level) wins over the Phase A reconciled
 * category, which is the final fallback.
 */
public class CategoryLabelResolver {

    private final Map<String, String> merchantToGroupName;
    private final Map<String, String> categoryToGroupName;

    CategoryLabelResolver(Map<String, String> merchantToGroupName, Map<String, String> categoryToGroupName) {
        this.merchantToGroupName = merchantToGroupName;
        this.categoryToGroupName = categoryToGroupName;
    }

    public String resolve(String normalizedMerchant, String effectiveCategoryPrimary) {
        if (normalizedMerchant != null && merchantToGroupName.containsKey(normalizedMerchant)) {
            return merchantToGroupName.get(normalizedMerchant);
        }
        if (effectiveCategoryPrimary != null && categoryToGroupName.containsKey(effectiveCategoryPrimary)) {
            return categoryToGroupName.get(effectiveCategoryPrimary);
        }
        return effectiveCategoryPrimary != null ? effectiveCategoryPrimary : "OTHER";
    }
}
