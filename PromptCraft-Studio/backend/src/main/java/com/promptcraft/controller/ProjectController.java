package com.promptcraft.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.ProjectDTO;
import com.promptcraft.entity.Project;
import com.promptcraft.service.ProjectService;
import com.promptcraft.service.PromptVersionService;
import com.promptcraft.vo.ProjectVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final PromptVersionService versionService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ApiResult<List<ProjectVO>> listProjects(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tags) {
        String tagsFilter = buildTagsFilter(tags);
        return ApiResult.success(projectService.listProjects(keyword, tagsFilter));
    }

    @PostMapping
    public ApiResult<Project> createProject(@Valid @RequestBody ProjectDTO dto) {
        return ApiResult.success(projectService.createProject(dto));
    }

    @GetMapping("/{id}")
    public ApiResult<ProjectVO> getProject(@PathVariable Long id) {
        return ApiResult.success(projectService.getProjectById(id));
    }

    @PutMapping("/{id}")
    public ApiResult<Project> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody ProjectDTO dto) {
        return ApiResult.success(projectService.updateProject(id, dto));
    }

    @DeleteMapping("/{id}")
    public ApiResult<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ApiResult.success(null);
    }

    @PutMapping("/{id}/stable")
    public ApiResult<Void> setStableVersion(
            @PathVariable Long id,
            @RequestParam Long versionId) {
        // 校验 versionId 属于该项目后再走事务化 stable 切换
        versionService.setStableVersion(id, versionId);
        return ApiResult.success(null);
    }

    private String buildTagsFilter(String tags) {
        if (tags == null || tags.isBlank()) return null;
        List<String> tagList = Arrays.stream(tags.split(","))
                .map(String::trim)
                .filter(t -> !t.isEmpty())
                .collect(Collectors.toList());
        if (tagList.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(tagList);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
