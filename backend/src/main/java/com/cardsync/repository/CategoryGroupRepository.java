package com.cardsync.repository;

import com.cardsync.model.CategoryGroup;
import com.cardsync.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryGroupRepository extends JpaRepository<CategoryGroup, UUID> {

    List<CategoryGroup> findAllByUser(User user);

    Optional<CategoryGroup> findByIdAndUser(UUID id, User user);
}
