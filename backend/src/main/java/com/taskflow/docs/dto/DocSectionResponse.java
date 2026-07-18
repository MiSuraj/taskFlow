package com.taskflow.docs.dto;

import com.taskflow.docs.domain.DocSection;

public record DocSectionResponse(String title, String content) {
    public static DocSectionResponse from(DocSection section) {
        return new DocSectionResponse(section.getTitle(), section.getContent());
    }
}
