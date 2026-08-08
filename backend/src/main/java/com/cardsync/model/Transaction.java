package com.cardsync.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "plaid_transaction_id", nullable = false, unique = true)
    private String plaidTransactionId;

    @Column(nullable = false)
    private Double amount;

    @Column(name = "iso_currency_code")
    private String isoCurrencyCode;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String name;

    @Column(name = "merchant_name")
    private String merchantName;

    /** Legacy Plaid taxonomy (e.g. "Travel > Taxi") -- kept as a fallback/debug field. */
    private String category;

    @Column(name = "category_primary")
    private String categoryPrimary;

    @Column(name = "category_detailed")
    private String categoryDetailed;

    @Column(name = "normalized_merchant")
    private String normalizedMerchant;

    /** Reconciled category across all of a user's transactions for the same normalized merchant; falls back to categoryPrimary when there's no cross-merchant disagreement to resolve. */
    @Column(name = "effective_category_primary")
    private String effectiveCategoryPrimary;

    @Column(nullable = false)
    private Boolean pending;

    @Column(name = "is_internal_transfer", nullable = false)
    private Boolean isInternalTransfer = false;

    @Column(name = "transfer_pair_id")
    private UUID transferPairId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
