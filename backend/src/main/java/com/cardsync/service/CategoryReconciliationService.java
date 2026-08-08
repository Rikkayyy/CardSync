package com.cardsync.service;

import com.cardsync.model.Transaction;
import com.cardsync.model.User;
import com.cardsync.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reconciles a user's transactions by normalized merchant so the same real-world
 * merchant lands under one consistent category, even when Plaid's own
 * personal_finance_category disagreed across occurrences (which happens across
 * different institutions/card networks reporting the same merchant differently).
 */
@Service
public class CategoryReconciliationService {

    private final TransactionRepository transactionRepository;

    public CategoryReconciliationService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public void reconcileCategories(User user) {
        List<Transaction> transactions = transactionRepository.findAllByUserOrderByDateDesc(user);

        // Backfill transactions synced before normalizedMerchant/effectiveCategoryPrimary existed —
        // Plaid sync is cursor-based/incremental, so upsertTransactions never revisits old rows.
        for (Transaction t : transactions) {
            if (t.getNormalizedMerchant() == null) {
                t.setNormalizedMerchant(MerchantNormalizer.normalize(t.getMerchantName(), t.getName()));
            }
            if (t.getEffectiveCategoryPrimary() == null) {
                t.setEffectiveCategoryPrimary(t.getCategoryPrimary());
            }
        }

        Map<String, List<Transaction>> byMerchant = new LinkedHashMap<>();
        for (Transaction t : transactions) {
            if (t.getNormalizedMerchant() == null) continue;
            byMerchant.computeIfAbsent(t.getNormalizedMerchant(), k -> new ArrayList<>()).add(t);
        }

        for (List<Transaction> group : byMerchant.values()) {
            if (group.size() < 2) continue;

            String majorityCategory = majorityCategory(group);
            if (majorityCategory == null) continue;

            for (Transaction t : group) {
                if (!majorityCategory.equals(t.getEffectiveCategoryPrimary())) {
                    t.setEffectiveCategoryPrimary(majorityCategory);
                }
            }
        }
    }

    private String majorityCategory(List<Transaction> group) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Transaction t : group) {
            if (t.getCategoryPrimary() == null) continue;
            counts.merge(t.getCategoryPrimary(), 1, Integer::sum);
        }

        String best = null;
        int bestCount = 0;
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            if (entry.getValue() > bestCount) {
                best = entry.getKey();
                bestCount = entry.getValue();
            }
        }
        return best;
    }
}
