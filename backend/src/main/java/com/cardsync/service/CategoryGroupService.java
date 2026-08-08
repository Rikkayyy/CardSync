package com.cardsync.service;

import com.cardsync.dto.CategoryGroupMemberResponse;
import com.cardsync.dto.CategoryGroupResponse;
import com.cardsync.dto.MerchantSummaryResponse;
import com.cardsync.model.CategoryGroup;
import com.cardsync.model.CategoryGroupMember;
import com.cardsync.model.CategoryGroupMemberType;
import com.cardsync.model.Transaction;
import com.cardsync.model.User;
import com.cardsync.repository.CategoryGroupMemberRepository;
import com.cardsync.repository.CategoryGroupRepository;
import com.cardsync.repository.TransactionRepository;
import com.cardsync.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CategoryGroupService {

    private final UserRepository userRepository;
    private final CategoryGroupRepository categoryGroupRepository;
    private final CategoryGroupMemberRepository categoryGroupMemberRepository;
    private final TransactionRepository transactionRepository;

    public CategoryGroupService(
            UserRepository userRepository,
            CategoryGroupRepository categoryGroupRepository,
            CategoryGroupMemberRepository categoryGroupMemberRepository,
            TransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.categoryGroupRepository = categoryGroupRepository;
        this.categoryGroupMemberRepository = categoryGroupMemberRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryGroupResponse> listGroups(String email) {
        User user = requireUser(email);
        List<CategoryGroup> groups = categoryGroupRepository.findAllByUser(user);
        List<CategoryGroupMember> members = categoryGroupMemberRepository.findAllByUser(user);
        return groups.stream().map(group -> toResponse(group, members)).toList();
    }

    @Transactional
    public CategoryGroupResponse createGroup(String email, String name) {
        User user = requireUser(email);
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group name is required");
        }
        CategoryGroup group = new CategoryGroup();
        group.setUser(user);
        group.setName(name.trim());
        categoryGroupRepository.save(group);
        return toResponse(group, List.of());
    }

    @Transactional
    public void deleteGroup(String email, UUID groupId) {
        User user = requireUser(email);
        CategoryGroup group = categoryGroupRepository.findByIdAndUser(groupId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        categoryGroupRepository.delete(group);
    }

    @Transactional
    public CategoryGroupResponse assignMember(String email, UUID groupId, CategoryGroupMemberType type, String value) {
        User user = requireUser(email);
        CategoryGroup group = categoryGroupRepository.findByIdAndUser(groupId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Value is required");
        }

        // A merchant/category can only belong to one group at a time — reassign rather than duplicate.
        categoryGroupMemberRepository.findByUserAndTypeAndValue(user, type, value)
                .ifPresent(categoryGroupMemberRepository::delete);

        CategoryGroupMember member = new CategoryGroupMember();
        member.setGroup(group);
        member.setMemberType(type);
        member.setMemberValue(value);
        categoryGroupMemberRepository.save(member);

        return toResponse(group, categoryGroupMemberRepository.findAllByUser(user));
    }

    @Transactional
    public void removeMember(String email, UUID memberId) {
        User user = requireUser(email);
        CategoryGroupMember member = categoryGroupMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
        if (!member.getGroup().getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found");
        }
        categoryGroupMemberRepository.delete(member);
    }

    @Transactional(readOnly = true)
    public List<MerchantSummaryResponse> listMerchants(String email) {
        User user = requireUser(email);
        List<Transaction> transactions = transactionRepository.findAllByUserOrderByDateDesc(user);
        List<CategoryGroupMember> members = categoryGroupMemberRepository.findAllByUser(user);

        Map<String, CategoryGroupMember> merchantMembers = new LinkedHashMap<>();
        for (CategoryGroupMember m : members) {
            if (m.getMemberType() == CategoryGroupMemberType.MERCHANT) {
                merchantMembers.put(m.getMemberValue(), m);
            }
        }

        record Agg(String displayName, String category, long count) {
        }

        Map<String, Agg> byMerchant = new LinkedHashMap<>();
        for (Transaction t : transactions) {
            if (t.getNormalizedMerchant() == null) continue;
            String display = t.getMerchantName() != null && !t.getMerchantName().isBlank() ? t.getMerchantName() : t.getName();
            String category = t.getEffectiveCategoryPrimary() != null ? t.getEffectiveCategoryPrimary() : t.getCategoryPrimary();
            byMerchant.merge(
                    t.getNormalizedMerchant(),
                    new Agg(display, category, 1),
                    (existing, incoming) -> new Agg(existing.displayName(), existing.category(), existing.count() + 1));
        }

        return byMerchant.entrySet().stream()
                .map(entry -> {
                    CategoryGroupMember member = merchantMembers.get(entry.getKey());
                    return new MerchantSummaryResponse(
                            entry.getKey(),
                            entry.getValue().displayName(),
                            entry.getValue().category(),
                            entry.getValue().count(),
                            member != null ? member.getGroup().getId() : null,
                            member != null ? member.getGroup().getName() : null,
                            member != null ? member.getId() : null);
                })
                .sorted(Comparator.comparingLong(MerchantSummaryResponse::transactionCount).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryLabelResolver resolverFor(User user) {
        List<CategoryGroupMember> members = categoryGroupMemberRepository.findAllByUser(user);
        Map<String, String> merchantToGroup = new LinkedHashMap<>();
        Map<String, String> categoryToGroup = new LinkedHashMap<>();
        for (CategoryGroupMember m : members) {
            if (m.getMemberType() == CategoryGroupMemberType.MERCHANT) {
                merchantToGroup.put(m.getMemberValue(), m.getGroup().getName());
            } else {
                categoryToGroup.put(m.getMemberValue(), m.getGroup().getName());
            }
        }
        return new CategoryLabelResolver(merchantToGroup, categoryToGroup);
    }

    private CategoryGroupResponse toResponse(CategoryGroup group, List<CategoryGroupMember> allUserMembers) {
        List<CategoryGroupMemberResponse> memberResponses = allUserMembers.stream()
                .filter(m -> m.getGroup().getId().equals(group.getId()))
                .map(m -> new CategoryGroupMemberResponse(m.getId(), m.getMemberType().name(), m.getMemberValue()))
                .toList();
        return new CategoryGroupResponse(group.getId(), group.getName(), memberResponses);
    }

    private User requireUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
