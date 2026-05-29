package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("run_record")
public class RunRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long projectId;

    private Long versionId;

    private Long apiPresetId;

    private String variablesJson;

    private String renderedSystemPrompt;

    private String renderedUserPrompt;

    private String outputText;

    private Integer inputChars;

    private Integer outputChars;

    private Integer inputTokens;

    private Integer outputTokens;

    private Integer latencyMs;

    private Boolean success;

    private String errorMessage;

    private String modelProvider;

    private String modelName;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
