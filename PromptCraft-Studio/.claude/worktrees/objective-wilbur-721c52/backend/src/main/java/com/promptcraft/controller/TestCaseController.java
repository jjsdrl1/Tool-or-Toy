package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.TestCaseDTO;
import com.promptcraft.entity.TestCase;
import com.promptcraft.service.TestCaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class TestCaseController {

    private final TestCaseService testCaseService;

    @GetMapping("/api/projects/{pid}/test-cases")
    public ApiResult<List<TestCase>> list(@PathVariable Long pid) {
        return ApiResult.ok(testCaseService.listTestCases(pid));
    }

    @PostMapping("/api/projects/{pid}/test-cases")
    public ApiResult<TestCase> create(@PathVariable Long pid,
                                      @Valid @RequestBody TestCaseDTO dto) {
        return ApiResult.ok(testCaseService.createTestCase(pid, dto));
    }

    @PutMapping("/api/test-cases/{id}")
    public ApiResult<TestCase> update(@PathVariable Long id,
                                      @Valid @RequestBody TestCaseDTO dto) {
        return ApiResult.ok(testCaseService.updateTestCase(id, dto));
    }

    @DeleteMapping("/api/test-cases/{id}")
    public ApiResult<Void> delete(@PathVariable Long id) {
        testCaseService.deleteTestCase(id);
        return ApiResult.ok(null);
    }

    @PostMapping("/api/projects/{pid}/test-cases/import")
    public ApiResult<Map<String, Integer>> importCsv(@PathVariable Long pid,
                                                     @RequestParam MultipartFile file) {
        int count = testCaseService.importFromCsv(pid, file);
        return ApiResult.ok(Map.of("importedCount", count));
    }

    @GetMapping("/api/projects/{pid}/test-cases/export")
    public ResponseEntity<byte[]> exportCsv(@PathVariable Long pid) {
        byte[] csv = testCaseService.exportToCsv(pid);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv;charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"test-cases.csv\"");
        return ResponseEntity.ok().headers(headers).body(csv);
    }
}
