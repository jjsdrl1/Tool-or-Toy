package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("batch_compare_group")
public class BatchCompareGroup {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long projectId;

    /** compare_versions / compare_presets */
    private String mode;

    /** pending / running / done / failed */
    private String status;

    private String name;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    private LocalDateTime finishedAt;
}
