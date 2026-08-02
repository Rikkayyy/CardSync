package com.cardsync.repository;

import com.cardsync.model.Transaction;
import com.cardsync.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByPlaidTransactionId(String plaidTransactionId);

    void deleteByPlaidTransactionId(String plaidTransactionId);

    @Query("""
            select t from Transaction t
            where t.account.plaidItem.user = :user
            order by t.date desc, t.createdAt desc
            """)
    List<Transaction> findAllByUserOrderByDateDesc(@Param("user") User user);
}
