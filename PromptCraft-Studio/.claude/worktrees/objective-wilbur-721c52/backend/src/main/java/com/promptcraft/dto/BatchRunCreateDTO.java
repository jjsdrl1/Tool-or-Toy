package com.promptcraft.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BatchRunCreateDTO {

    @NotNull(message = "projectId 不能为空")
    private Long projectId;

    @NotNull(message = "versionId 不能为空")
    private Long versionId;

    @NotNull(message = "presetId 不能为空")
    private Long presetId;

    @NotEmpty(message = "testCaseIds 不能为空")
    private List<Long> testCaseIds;

    /** Concurrency 1~5, default 2 */
    private Integer concurrency = 2;
}
