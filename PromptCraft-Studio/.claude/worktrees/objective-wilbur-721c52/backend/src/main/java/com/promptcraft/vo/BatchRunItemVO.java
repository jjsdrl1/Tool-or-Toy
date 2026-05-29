package com.promptcraft.vo;

import lombok.Data;

@Data
public class BatchRunItemVO {

    private Long id;

    private Long testCaseId;

    private String testCaseName;

    /** pending / running / done / failed */
    private String status;

    private String errorMessage;

    /** First 100 chars of output_text from run_record */
    private String outputSummary;
}
