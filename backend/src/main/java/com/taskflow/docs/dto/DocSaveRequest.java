package com.taskflow.docs.dto;

import java.util.List;

public record DocSaveRequest(List<DocSectionRequest> sections) {
}
