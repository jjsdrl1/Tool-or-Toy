package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.VersionSaveDTO;
import com.promptcraft.entity.PromptVersion;
import com.promptcraft.service.PromptVersionService;
import com.promptcraft.vo.DiffResult;
import com.promptcraft.vo.VersionVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PromptVersionController {

    private final PromptVersionService versionService;

    @GetMapping("/api/projects/{pid}/versions")
    public ApiResult<List<VersionVO>> listVersions(@PathVariable Long pid) {
        return ApiResult.success(versionService.listVersions(pid));
    }

    @PostMapping("/api/projects/{pid}/versions")
    public ApiResult<PromptVersion> saveVersion(
            @PathVariable Long pid,
            @Valid @RequestBody VersionSaveDTO dto) {
        return ApiResult.success(versionService.saveVersion(pid, dto));
    }

    @GetMapping("/api/versions/{id}")
    public ApiResult<VersionVO> getVersion(@PathVariable Long id) {
        return ApiResult.success(versionService.getVersion(id));
    }

    @PutMapping("/api/versions/{id}/status")
    public ApiResult<Void> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        versionService.updateStatus(id, status);
        return ApiResult.success(null);
    }

    @PostMapping("/api/versions/{id}/fork")
    public ApiResult<PromptVersion> forkVersion(@PathVariable Long id) {
        return ApiResult.success(versionService.forkVersion(id));
    }

    @DeleteMapping("/api/versions/{id}")
    public ApiResult<Void> deleteVersion(@PathVariable Long id) {
        versionService.deleteVersion(id);
        return ApiResult.success(null);
    }

    @GetMapping("/api/versions/diff")
    public ApiResult<DiffResult> diffVersions(
            @RequestParam Long a,
            @RequestParam Long b) {
        return ApiResult.success(versionService.diffVersions(a, b));
    }
}
