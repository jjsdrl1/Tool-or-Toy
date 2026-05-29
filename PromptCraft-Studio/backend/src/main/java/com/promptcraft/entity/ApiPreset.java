package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@TableName("api_preset")
public class ApiPreset {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;

    private String provider;

    private String baseUrl;

    /** AES-256-GCM 加密后的 API Key，不对外暴露 */
    @JsonIgnore
    private String apiKeyEncrypted;

    private String modelName;

    @Builder.Default
    private BigDecimal temperature = new BigDecimal("0.70");

    @Builder.Default
    private Integer maxTokens = 1024;

    @Builder.Default
    private Boolean enabled = true;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
