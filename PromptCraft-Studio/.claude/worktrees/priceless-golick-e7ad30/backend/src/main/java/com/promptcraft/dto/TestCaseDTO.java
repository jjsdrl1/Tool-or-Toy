package com.promptcraft.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class TestCaseDTO {

    @NotBlank(message = "样例名称不能为空")
    private String name;

    private Map<String, String> variablesJson;

    private String expectedOutput;
}
