package com.promptcraft.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class BatchRunStatusVO {

    private Long id;

    private Long projectId;

    private Long versionId;

    private Long presetId;

    private String status;

    private Integer totalCount;

    private Integer successCount;

    private Integer failedCount;

    private LocalDateTime createdAt;

    private LocalDateTime finishedAt;

    private List<BatchRunItemVO> items;
}
