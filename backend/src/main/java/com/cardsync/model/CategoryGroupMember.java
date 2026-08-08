package com.cardsync.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Assigns one merchant (normalizedMerchant) or one Plaid category (effectiveCategoryPrimary)
 * to a user-defined CategoryGroup, overriding the default reconciled category for display.
 */
@Entity
@Table(name = "category_group_members")
@Getter
@Setter
@NoArgsConstructor
public class CategoryGroupMember {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_group_id", nullable = false)
    private CategoryGroup group;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_type", nullable = false)
    private CategoryGroupMemberType memberType;

    @Column(name = "member_value", nullable = false)
    private String memberValue;
}
