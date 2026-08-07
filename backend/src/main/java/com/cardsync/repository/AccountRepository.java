package com.cardsync.repository;

import com.cardsync.model.Account;
import com.cardsync.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByPlaidAccountId(String plaidAccountId);

    List<Account> findAllByPlaidItem_User(User user);
}
