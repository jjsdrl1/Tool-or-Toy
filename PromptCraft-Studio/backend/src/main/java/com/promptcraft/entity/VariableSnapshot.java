package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("variable_snapshot")
public class VariableSnapshot {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long versionId;

    private String name;

    /** JSON string of variable key-value pairs */
    private String variablesJson;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
