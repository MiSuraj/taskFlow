package com.taskflow.ai.web;

import com.taskflow.ai.dto.AiStatusResponse;
import com.taskflow.ai.dto.GenerateTasksRequest;
import com.taskflow.ai.dto.GeneratedTaskDto;
import com.taskflow.ai.service.AiTaskGenerationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiTaskGenerationService aiTaskGenerationService;

    public AiController(AiTaskGenerationService aiTaskGenerationService) {
        this.aiTaskGenerationService = aiTaskGenerationService;
    }

    @PostMapping("/generate-tasks")
    @PreAuthorize("hasRole('MANAGER')")
    public List<GeneratedTaskDto> generateTasks(@Valid @RequestBody GenerateTasksRequest request) {
        return aiTaskGenerationService.generateTasks(request.prompt());
    }

    @GetMapping("/ai-status")
    public AiStatusResponse status() {
        return aiTaskGenerationService.status();
    }
}
