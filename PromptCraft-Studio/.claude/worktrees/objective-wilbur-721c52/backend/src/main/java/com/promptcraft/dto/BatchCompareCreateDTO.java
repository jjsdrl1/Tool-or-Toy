package com.promptcraft.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BatchCompareCreateDTO {

    @NotNull(message = "projectId 不能为空")
    private Long projectId;

    /** compare_versions: fix preset, vary versions; compare_presets: fix version, vary presets */
    @NotNull(message = "mode 不能为空")
    private String mode;

    /** Required when mode=compare_presets; optional list when mode=compare_versions */
    private Long fixedVersionId;

    /** Required when mode=compare_versions; optional list when mode=compare_presets */
    private Long fixedPresetId;

    /** When mode=compare_versions: the version IDs to compare */
    private List<Long> versionIds;

    /** When mode=compare_presets: the preset IDs to compare */
    private List<Long> presetIds;

    @NotEmpty(message = "testCaseIds 不能为空")
    private List<Long> testCaseIds;

    private Integer concurrency = 2;
}
