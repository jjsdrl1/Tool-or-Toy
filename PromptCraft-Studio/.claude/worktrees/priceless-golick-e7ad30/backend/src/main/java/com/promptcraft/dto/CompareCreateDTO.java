package com.promptcraft.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CompareCreateDTO {

    @NotNull(message = "projectId 不能为空")
    private Long projectId;

    @NotNull(message = "versionAId 不能为空")
    private Long versionAId;

    @NotNull(message = "versionBId 不能为空")
    private Long versionBId;
}
