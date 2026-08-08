package com.cardsync.service;

import com.cardsync.model.Transaction;
import com.cardsync.model.User;
import com.cardsync.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Detects transfers between a user's own linked accounts by matching transactions
 * with equal magnitude, opposite sign, on different accounts, within a few days of
 * each other. This catches internal transfers even when Plaid's own category
 * taxonomy doesn't tag them as TRANSFER_IN/TRANSFER_OUT.
 */
@Service
public class TransferDetectionService {

    private static final int LOOKBACK_DAYS = 60;
    private static final int MATCH_WINDOW_DAYS = 3;

    private final TransactionRepository transactionRepository;

    public TransferDetectionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public void detectTransfers(User user) {
        LocalDate since = LocalDate.now().minusDays(LOOKBACK_DAYS);
        List<Transaction> candidates = transactionRepository.findUnmatchedByUserSince(user, since);

        Map<Long, List<Transaction>> byAmount = new HashMap<>();
        for (Transaction t : candidates) {
            if (t.getAmount() == null || t.getAmount() == 0) continue;
            long cents = Math.round(Math.abs(t.getAmount()) * 100);
            byAmount.computeIfAbsent(cents, k -> new ArrayList<>()).add(t);
        }

        Set<UUID> matched = new HashSet<>();
        for (List<Transaction> group : byAmount.values()) {
            if (group.size() < 2) continue;

            for (Transaction t1 : group) {
                if (matched.contains(t1.getId())) continue;

                Transaction best = null;
                long bestDiff = Long.MAX_VALUE;
                for (Transaction t2 : group) {
                    if (t1 == t2 || matched.contains(t2.getId())) continue;
                    if (t1.getAccount().getId().equals(t2.getAccount().getId())) continue;
                    boolean oppositeSign = (t1.getAmount() > 0) != (t2.getAmount() > 0);
                    if (!oppositeSign) continue;

                    long daysApart = Math.abs(ChronoUnit.DAYS.between(t1.getDate(), t2.getDate()));
                    if (daysApart > MATCH_WINDOW_DAYS) continue;

                    if (daysApart < bestDiff) {
                        bestDiff = daysApart;
                        best = t2;
                    }
                }

                if (best != null) {
                    t1.setIsInternalTransfer(true);
                    t1.setTransferPairId(best.getId());
                    best.setIsInternalTransfer(true);
                    best.setTransferPairId(t1.getId());
                    matched.add(t1.getId());
                    matched.add(best.getId());
                    transactionRepository.save(t1);
                    transactionRepository.save(best);
                }
            }
        }
    }
}
