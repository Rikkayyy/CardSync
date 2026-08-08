package com.cardsync.dto;

import java.util.List;
import java.util.UUID;

public record CategoryGroupResponse(UUID id, String name, List<CategoryGroupMemberResponse> members) {
}
