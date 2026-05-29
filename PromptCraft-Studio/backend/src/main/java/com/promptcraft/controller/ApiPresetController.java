package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.ApiPresetDTO;
import com.promptcraft.entity.ApiPreset;
import com.promptcraft.service.ApiPresetService;
import com.promptcraft.vo.ApiPresetVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/presets")
@RequiredArgsConstructor
public class ApiPresetController {

    private final ApiPresetService apiPresetService;

    @GetMapping
    public ApiResult<List<ApiPresetVO>> listPresets() {
        return ApiResult.success(apiPresetService.listPresets());
    }

    @PostMapping
    public ApiResult<ApiPreset> createPreset(@Valid @RequestBody ApiPresetDTO dto) {
        return ApiResult.success(apiPresetService.createPreset(dto));
    }

    @PutMapping("/{id}")
    public ApiResult<ApiPreset> updatePreset(
            @PathVariable Long id,
            @Valid @RequestBody ApiPresetDTO dto) {
        return ApiResult.success(apiPresetService.updatePreset(id, dto));
    }

    @DeleteMapping("/{id}")
    public ApiResult<Void> deletePreset(@PathVariable Long id) {
        apiPresetService.deletePreset(id);
        return ApiResult.success(null);
    }

    @PostMapping("/{id}/test")
    public ApiResult<Map<String, Object>> testPreset(@PathVariable Long id) {
        return ApiResult.success(apiPresetService.testPreset(id));
    }
}
