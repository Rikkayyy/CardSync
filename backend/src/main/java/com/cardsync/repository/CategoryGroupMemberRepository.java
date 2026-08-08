package com.cardsync.repository;

import com.cardsync.model.CategoryGroupMember;
import com.cardsync.model.CategoryGroupMemberType;
import com.cardsync.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryGroupMemberRepository extends JpaRepository<CategoryGroupMember, UUID> {

    @Query("""
            select m from CategoryGroupMember m
            where m.group.user = :user
            """)
    List<CategoryGroupMember> findAllByUser(@Param("user") User user);

    @Query("""
            select m from CategoryGroupMember m
            where m.group.user = :user and m.memberType = :type and m.memberValue = :value
            """)
    Optional<CategoryGroupMember> findByUserAndTypeAndValue(
            @Param("user") User user,
            @Param("type") CategoryGroupMemberType type,
            @Param("value") String value);
}
