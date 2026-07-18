package com.taskflow.docs.dto;

import com.taskflow.identity.dto.UserSummary;

import java.util.List;

public record DocResponse(String id, String project, List<DocSectionResponse> sections, UserSummary lastEditedBy) {
}
