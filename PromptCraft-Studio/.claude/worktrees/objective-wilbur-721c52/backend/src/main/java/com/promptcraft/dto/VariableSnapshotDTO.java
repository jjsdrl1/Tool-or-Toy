package com.promptcraft.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class VariableSnapshotDTO {

    @NotBlank(message = "变量组名称不能为空")
    private String name;

    @NotNull(message = "变量内容不能为空")
    private Map<String, String> variables;
}
