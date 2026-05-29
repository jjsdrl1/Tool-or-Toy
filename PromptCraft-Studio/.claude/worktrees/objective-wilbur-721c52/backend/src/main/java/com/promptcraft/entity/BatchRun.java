package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("batch_run")
public class BatchRun {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long projectId;

    private Long versionId;

    /** preset_id added via migration V2__add_preset_id_to_batch_run.sql */
    private Long presetId;

    /** Links to batch_compare_group when this run is part of a comparison */
    private Long compareGroupId;

    /** pending / running / done / failed */
    private String status;

    private Integer totalCount;

    private Integer successCount;

    private Integer failedCount;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    private LocalDateTime finishedAt;
}
