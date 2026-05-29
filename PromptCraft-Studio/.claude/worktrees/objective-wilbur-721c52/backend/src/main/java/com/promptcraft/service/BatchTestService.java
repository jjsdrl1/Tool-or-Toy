package com.promptcraft.service;

import com.promptcraft.dto.BatchRunCreateDTO;
import com.promptcraft.entity.BatchRun;
import com.promptcraft.vo.BatchRunStatusVO;

import java.util.List;

public interface BatchTestService {

    /**
     * Create a batch run and start async execution.
     */
    BatchRun createBatchRun(BatchRunCreateDTO dto);

    /**
     * Get status and item details for a batch run.
     */
    BatchRunStatusVO getBatchRunStatus(Long id);

    List<BatchRun> listByProject(Long projectId);

    /**
     * Export batch run results as CSV bytes.
     * Columns: sample_name, {variable keys}, output, input_tokens, output_tokens, latency_ms, success
     */
    byte[] exportBatchResultCsv(Long id);
}
