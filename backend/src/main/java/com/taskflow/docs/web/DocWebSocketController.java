package com.taskflow.docs.web;

import com.taskflow.common.exception.ForbiddenException;
import com.taskflow.common.security.WsPrincipal;
import com.taskflow.docs.dto.DocBroadcastMessage;
import com.taskflow.docs.dto.DocChangeMessage;
import com.taskflow.docs.dto.DocSaveRequest;
import com.taskflow.docs.dto.DocSectionResponse;
import com.taskflow.docs.domain.ProjectDoc;
import com.taskflow.docs.service.ProjectDocService;
import com.taskflow.identity.dto.UserSummary;
import com.taskflow.identity.repository.UserRepository;
import com.taskflow.project.service.ProjectAccessService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * STOMP counterpart to socket.io's join-doc/doc-change/doc-save/leave-doc events. "join"/"leave"
 * have no explicit handler here — SUBSCRIBE/UNSUBSCRIBE to the doc topic IS join/leave in STOMP,
 * and subscription access is already enforced in {@code StompAuthChannelInterceptor}. Access is
 * re-checked here too since SEND destinations aren't covered by that interceptor.
 */
@Controller
public class DocWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ProjectAccessService projectAccessService;
    private final ProjectDocService projectDocService;
    private final UserRepository userRepository;

    public DocWebSocketController(
            SimpMessagingTemplate messagingTemplate,
            ProjectAccessService projectAccessService,
            ProjectDocService projectDocService,
            UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.projectAccessService = projectAccessService;
        this.projectDocService = projectDocService;
        this.userRepository = userRepository;
    }

    @MessageMapping("/doc/{projectId}/change")
    public void handleChange(@DestinationVariable String projectId, DocChangeMessage message, Principal principal) {
        WsPrincipal wsPrincipal = requireAccess(principal, projectId);
        messagingTemplate.convertAndSend(
                docTopic(wsPrincipal.tenantSlug(), projectId),
                new DocBroadcastMessage("change", message.sectionIndex(), message.content(), null,
                        resolveUser(wsPrincipal)));
    }

    @MessageMapping("/doc/{projectId}/save")
    public void handleSave(@DestinationVariable String projectId, DocSaveRequest request, Principal principal) {
        WsPrincipal wsPrincipal = requireAccess(principal, projectId);
        ProjectDoc doc = projectDocService.save(projectId, request, wsPrincipal.user().id());
        messagingTemplate.convertAndSend(
                docTopic(wsPrincipal.tenantSlug(), projectId),
                new DocBroadcastMessage("saved", null, null,
                        doc.getSections().stream().map(DocSectionResponse::from).toList(),
                        resolveUser(wsPrincipal)));
    }

    private WsPrincipal requireAccess(Principal principal, String projectId) {
        WsPrincipal wsPrincipal = (WsPrincipal) principal;
        if (!projectAccessService.canAccess(wsPrincipal.user().id(), wsPrincipal.user().role(), projectId)) {
            throw new ForbiddenException("Access denied");
        }
        return wsPrincipal;
    }

    private UserSummary resolveUser(WsPrincipal principal) {
        return userRepository.findById(principal.user().id()).map(UserSummary::from).orElse(null);
    }

    private String docTopic(String tenantSlug, String projectId) {
        return "/topic/tenant." + tenantSlug + ".doc." + projectId;
    }
}
