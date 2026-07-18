package com.taskflow.docs.service;

import com.taskflow.docs.domain.ProjectDoc;
import com.taskflow.docs.dto.DocResponse;
import com.taskflow.docs.dto.DocSectionResponse;
import com.taskflow.identity.dto.UserSummary;
import com.taskflow.identity.repository.UserRepository;
import org.springframework.stereotype.Component;

@Component
public class ProjectDocMapper {

    private final UserRepository userRepository;

    public ProjectDocMapper(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public DocResponse toResponse(ProjectDoc doc) {
        UserSummary lastEditedBy = doc.getLastEditedBy() == null ? null
                : userRepository.findById(doc.getLastEditedBy()).map(UserSummary::from).orElse(null);
        return new DocResponse(
                doc.getId(),
                doc.getProject(),
                doc.getSections().stream().map(DocSectionResponse::from).toList(),
                lastEditedBy);
    }
}
