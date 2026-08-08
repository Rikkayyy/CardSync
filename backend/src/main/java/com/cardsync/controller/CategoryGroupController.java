package com.cardsync.controller;

import com.cardsync.dto.AssignMemberRequest;
import com.cardsync.dto.CategoryGroupResponse;
import com.cardsync.dto.CreateCategoryGroupRequest;
import com.cardsync.dto.MerchantSummaryResponse;
import com.cardsync.service.CategoryGroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/category-groups")
public class CategoryGroupController {

    private final CategoryGroupService categoryGroupService;

    public CategoryGroupController(CategoryGroupService categoryGroupService) {
        this.categoryGroupService = categoryGroupService;
    }

    @GetMapping
    public ResponseEntity<List<CategoryGroupResponse>> list(Authentication authentication) {
        return ResponseEntity.ok(categoryGroupService.listGroups(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<CategoryGroupResponse> create(
            @RequestBody CreateCategoryGroupRequest request, Authentication authentication) {
        return ResponseEntity.ok(categoryGroupService.createGroup(authentication.getName(), request.name()));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<Void> delete(@PathVariable UUID groupId, Authentication authentication) {
        categoryGroupService.deleteGroup(authentication.getName(), groupId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<CategoryGroupResponse> assignMember(
            @PathVariable UUID groupId, @RequestBody AssignMemberRequest request, Authentication authentication) {
        return ResponseEntity.ok(
                categoryGroupService.assignMember(authentication.getName(), groupId, request.type(), request.value()));
    }

    @DeleteMapping("/members/{memberId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID memberId, Authentication authentication) {
        categoryGroupService.removeMember(authentication.getName(), memberId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/merchants")
    public ResponseEntity<List<MerchantSummaryResponse>> merchants(Authentication authentication) {
        return ResponseEntity.ok(categoryGroupService.listMerchants(authentication.getName()));
    }
}
