package com.cardsync.repository;

import com.cardsync.model.PlaidItem;
import com.cardsync.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PlaidItemRepository extends JpaRepository<PlaidItem, UUID> {

    List<PlaidItem> findAllByUser(User user);
}
