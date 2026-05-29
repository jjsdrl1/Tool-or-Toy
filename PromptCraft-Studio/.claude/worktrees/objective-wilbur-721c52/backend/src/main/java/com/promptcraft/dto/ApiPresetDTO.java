package com.promptcraft.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ApiPresetDTO {

    @NotBlank(message = "配置名称不能为空")
    private String name;

    @NotBlank(message = "Provider 不能为空")
    private String provider;

    private String baseUrl;

    /** 明文 API Key，为空表示编辑时不修改 */
    private String apiKey;

    @NotBlank(message = "模型名称不能为空")
    private String modelName;

    private BigDecimal temperature;

    private Integer maxTokens;

    private Boolean enabled;
}
