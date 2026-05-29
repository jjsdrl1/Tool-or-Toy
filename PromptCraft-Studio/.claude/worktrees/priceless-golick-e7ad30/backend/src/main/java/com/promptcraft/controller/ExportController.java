package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.ExportRequestDTO;
import com.promptcraft.service.CodeExportService;
import com.promptcraft.vo.ExportResultVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
public class ExportController {

    private final CodeExportService codeExportService;

    @PostMapping("/code")
    public ApiResult<ExportResultVO> exportCode(@Valid @RequestBody ExportRequestDTO dto) {
        return ApiResult.ok(codeExportService.export(dto));
    }

    @PostMapping("/json")
    public ApiResult<Map<String, Object>> exportJson(@RequestBody ExportRequestDTO dto) {
        return ApiResult.ok(codeExportService.exportJson(dto.getVersionId(), dto.getPresetId()));
    }
}
