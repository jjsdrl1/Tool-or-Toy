package com.promptcraft.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class BatchCompareResultVO {

    private Long id;
    private Long projectId;
    private String mode;
    private String status;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime finishedAt;

    private List<CompareColumn> columns;
    private List<CompareRow> rows;

    @Data
    public static class CompareColumn {
        private Long batchRunId;
        private Long versionId;
        private String versionLabel;
        private Long presetId;
        private String presetLabel;
        private String status;
        private Integer successCount;
        private Integer failedCount;
        private Integer totalCount;
    }

    @Data
    public static class CompareRow {
        private Long testCaseId;
        private String testCaseName;
        private List<CellResult> cells;
    }

    @Data
    public static class CellResult {
        private Long batchRunId;
        private String status;
        private String outputSummary;
        private String errorMessage;
        private Integer inputTokens;
        private Integer outputTokens;
        private Integer latencyMs;
    }
}
