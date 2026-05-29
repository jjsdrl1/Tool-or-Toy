package com.promptcraft.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CompareRecordVO {

    private Long id;
    private Long projectId;
    private Long versionAId;
    private Long versionBId;
    private Long runAId;
    private Long runBId;
    private Long winnerVersionId;
    private String reason;
    private LocalDateTime createdAt;

    /** version_no of version A, joined from prompt_version */
    private Integer versionANo;

    /** version_no of version B, joined from prompt_version */
    private Integer versionBNo;
}
