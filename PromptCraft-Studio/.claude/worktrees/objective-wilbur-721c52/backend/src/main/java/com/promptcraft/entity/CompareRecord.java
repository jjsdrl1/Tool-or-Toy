package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("compare_record")
public class CompareRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long projectId;

    private Long versionAId;

    private Long versionBId;

    private Long runAId;

    private Long runBId;

    private Long winnerVersionId;

    private String reason;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
