package com.promptcraft.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ExportRequestDTO {

    @NotNull(message = "versionId 不能为空")
    private Long versionId;

    @NotNull(message = "presetId 不能为空")
    private Long presetId;

    /** "python" or "typescript", default "python" */
    private String language = "python";
}
