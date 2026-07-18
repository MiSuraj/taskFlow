package com.taskflow.docs.dto;

import com.taskflow.identity.dto.UserSummary;

import java.util.List;

/**
 * Outbound envelope broadcast to {@code /topic/tenant.<slug>.doc.<projectId>}. {@code type} is
 * {@code "change"} (live per-keystroke edit, one section) or {@code "saved"} (full doc persisted).
 */
public record DocBroadcastMessage(
        String type,
        Integer sectionIndex,
        String content,
        List<DocSectionResponse> sections,
        UserSummary editedBy
) {
}
