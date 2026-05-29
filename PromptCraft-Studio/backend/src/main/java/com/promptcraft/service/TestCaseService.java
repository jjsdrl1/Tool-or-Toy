package com.promptcraft.service;

import com.promptcraft.dto.TestCaseDTO;
import com.promptcraft.entity.TestCase;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TestCaseService {

    List<TestCase> listTestCases(Long projectId);

    TestCase createTestCase(Long projectId, TestCaseDTO dto);

    TestCase updateTestCase(Long id, TestCaseDTO dto);

    void deleteTestCase(Long id);

    /**
     * Import test cases from CSV. First row = variable name headers,
     * subsequent rows = data. Returns number of imported rows.
     */
    int importFromCsv(Long projectId, MultipartFile file);

    /**
     * Export all test cases for a project as CSV bytes.
     * Columns: name, {variable keys aggregated from all samples}, expected_output
     */
    byte[] exportToCsv(Long projectId);
}
