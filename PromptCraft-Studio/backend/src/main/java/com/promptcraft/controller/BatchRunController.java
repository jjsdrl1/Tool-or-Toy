package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.BatchRunCreateDTO;
import com.promptcraft.entity.BatchRun;
import com.promptcraft.service.BatchTestService;
import com.promptcraft.vo.BatchRunStatusVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BatchRunController {

    private final BatchTestService batchTestService;

    @PostMapping("/api/batch-runs")
    public ApiResult<BatchRun> create(@Valid @RequestBody BatchRunCreateDTO dto) {
        return ApiResult.ok(batchTestService.createBatchRun(dto));
    }

    @GetMapping("/api/batch-runs/{id}")
    public ApiResult<BatchRunStatusVO> getStatus(@PathVariable Long id) {
        return ApiResult.ok(batchTestService.getBatchRunStatus(id));
    }

    @GetMapping("/api/projects/{pid}/batch-runs")
    public ApiResult<List<BatchRun>> listByProject(@PathVariable Long pid) {
        return ApiResult.ok(batchTestService.listByProject(pid));
    }

    @GetMapping("/api/batch-runs/{id}/export")
    public ResponseEntity<byte[]> export(@PathVariable Long id) {
        byte[] csv = batchTestService.exportBatchResultCsv(id);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv;charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"batch-result-" + id + ".csv\"");
        return ResponseEntity.ok().headers(headers).body(csv);
    }
}
