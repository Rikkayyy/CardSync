package com.cardsync.dto;

import com.cardsync.model.CategoryGroupMemberType;

public record AssignMemberRequest(CategoryGroupMemberType type, String value) {
}
