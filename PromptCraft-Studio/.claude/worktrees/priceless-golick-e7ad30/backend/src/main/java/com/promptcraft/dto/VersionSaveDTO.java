package com.promptcraft.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VersionSaveDTO {

    private String systemPrompt;

    @NotBlank(message = "User Prompt 不能为空")
    private String userPrompt;

    @NotBlank(message = "版本备注不能为空")
    private String note;
}
