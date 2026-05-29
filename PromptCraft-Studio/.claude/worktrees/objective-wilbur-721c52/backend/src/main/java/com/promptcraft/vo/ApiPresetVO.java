package com.promptcraft.vo;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * API 配置预设响应视图，不暴露 apiKeyEncrypted 字段。
 */
@Data
public class ApiPresetVO {

    private Long id;
    private String name;
    private String provider;
    private String baseUrl;
    private String modelName;
    private BigDecimal temperature;
    private Integer maxTokens;
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** "****" + 末4位，或 "(未设置)" */
    private String apiKeyMasked;
}
