package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.BatchCompareCreateDTO;
import com.promptcraft.entity.BatchCompareGroup;
import com.promptcraft.service.BatchCompareService;
import com.promptcraft.vo.BatchCompareResultVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BatchCompareController {

    private final BatchCompareService batchCompareService;

    @PostMapping("/api/batch-compares")
    public ApiResult<BatchCompareGroup> create(@Valid @RequestBody BatchCompareCreateDTO dto) {
        return ApiResult.ok(batchCompareService.createCompare(dto));
    }

    @GetMapping("/api/batch-compares/{id}")
    public ApiResult<BatchCompareResultVO> getResult(@PathVariable Long id) {
        return ApiResult.ok(batchCompareService.getCompareResult(id));
    }

    @GetMapping("/api/projects/{pid}/batch-compares")
    public ApiResult<List<BatchCompareGroup>> listByProject(@PathVariable Long pid) {
        return ApiResult.ok(batchCompareService.listByProject(pid));
    }
}
