package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.CompareCreateDTO;
import com.promptcraft.dto.LinkRunDTO;
import com.promptcraft.dto.WinnerUpdateDTO;
import com.promptcraft.entity.CompareRecord;
import com.promptcraft.service.CompareService;
import com.promptcraft.vo.CompareRecordVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CompareController {

    private final CompareService compareService;

    @PostMapping("/compares")
    public ApiResult<CompareRecord> createCompare(@Valid @RequestBody CompareCreateDTO dto) {
        return ApiResult.success(compareService.createCompare(dto));
    }

    @GetMapping("/projects/{projectId}/compares")
    public ApiResult<List<CompareRecordVO>> listCompares(@PathVariable Long projectId) {
        return ApiResult.success(compareService.listCompares(projectId));
    }

    @PutMapping("/compares/{id}/winner")
    public ApiResult<Void> updateWinner(@PathVariable Long id,
                                        @RequestBody WinnerUpdateDTO dto) {
        compareService.updateWinner(id, dto.getWinnerVersionId(), dto.getReason());
        return ApiResult.success(null);
    }

    @PutMapping("/compares/{id}/link-run")
    public ApiResult<Void> linkRunRecord(@PathVariable Long id,
                                         @Valid @RequestBody LinkRunDTO dto) {
        compareService.linkRunRecord(id, dto.getSide(), dto.getRunRecordId());
        return ApiResult.success(null);
    }
}
