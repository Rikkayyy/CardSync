package com.cardsync.repository;

import com.cardsync.model.PlaidItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PlaidItemRepository extends JpaRepository<PlaidItem, UUID> {
}
