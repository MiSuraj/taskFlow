package com.taskflow.docs.service;

import com.taskflow.docs.domain.DocSection;
import com.taskflow.docs.domain.ProjectDoc;
import com.taskflow.docs.dto.DocSaveRequest;
import com.taskflow.docs.repository.ProjectDocRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectDocService {

    private final ProjectDocRepository projectDocRepository;

    public ProjectDocService(ProjectDocRepository projectDocRepository) {
        this.projectDocRepository = projectDocRepository;
    }

    public ProjectDoc getOrCreate(String projectId) {
        return projectDocRepository.findByProject(projectId).orElseGet(() -> projectDocRepository.save(
                ProjectDoc.builder()
                        .project(projectId)
                        .sections(List.of(
                                new DocSection("Overview", ""),
                                new DocSection("Architecture", ""),
                                new DocSection("Discussion", "")))
                        .build()));
    }

    /**
     * The only path that writes to the database. Live per-keystroke edits (see the WebSocket
     * handler's "change" message) are broadcast to other collaborators but never persisted —
     * exactly like the Node backend, which only wrote to Mongo on the client's debounced
     * "doc-save" event, not on every "doc-change" broadcast.
     */
    public ProjectDoc save(String projectId, DocSaveRequest request, String editorUserId) {
        ProjectDoc doc = getOrCreate(projectId);
        doc.setSections(request.sections().stream()
                .map(s -> new DocSection(s.title(), s.content()))
                .toList());
        doc.setLastEditedBy(editorUserId);
        return projectDocRepository.save(doc);
    }
}
