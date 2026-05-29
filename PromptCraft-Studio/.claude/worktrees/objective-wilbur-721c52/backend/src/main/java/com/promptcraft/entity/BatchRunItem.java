package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("batch_run_item")
public class BatchRunItem {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long batchRunId;

    private Long testCaseId;

    /** Filled after successful run */
    private Long runRecordId;

    /** pending / running / done / failed */
    private String status;

    private String errorMessage;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
