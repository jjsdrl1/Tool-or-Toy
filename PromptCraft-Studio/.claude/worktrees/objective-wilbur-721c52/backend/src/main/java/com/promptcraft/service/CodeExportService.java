package com.promptcraft.service;

import com.promptcraft.dto.ExportRequestDTO;
import com.promptcraft.vo.ExportResultVO;

import java.util.Map;

public interface CodeExportService {

    /**
     * Generate SDK code from a version + preset.
     * Returns the rendered code string and the derived function name.
     */
    ExportResultVO export(ExportRequestDTO dto);

    /**
     * Return a combined JSON-ready map of the version and preset configuration.
     */
    Map<String, Object> exportJson(Long versionId, Long presetId);
}
