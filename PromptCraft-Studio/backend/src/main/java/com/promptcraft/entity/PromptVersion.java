package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@TableName("prompt_version")
public class PromptVersion {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long projectId;

    private Integer versionNo;

    private String systemPrompt;

    private String userPrompt;

    private String note;

    @Builder.Default
    private String status = "draft";

    private String modelProvider;

    private String modelName;

    private BigDecimal temperature;

    private Integer maxTokens;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
