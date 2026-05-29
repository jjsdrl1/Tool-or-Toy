package com.promptcraft.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RunRequestDTO {

    @NotNull(message = "versionId 不能为空")
    private Long versionId;

    @NotNull(message = "presetId 不能为空")
    private Long presetId;

    /** JSON 对象字符串，e.g. {"role":"翻译","content":"..."} */
    private String variablesJson;
}
