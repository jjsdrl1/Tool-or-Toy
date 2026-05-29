package com.promptcraft.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptcraft.dto.TestCaseDTO;
import com.promptcraft.entity.TestCase;
import com.promptcraft.exception.BizException;
import com.promptcraft.mapper.TestCaseMapper;
import com.promptcraft.service.TestCaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class TestCaseServiceImpl implements TestCaseService {

    private final TestCaseMapper testCaseMapper;
    private final ObjectMapper objectMapper;

    @Override
    public List<TestCase> listTestCases(Long projectId) {
        return testCaseMapper.selectByProjectId(projectId);
    }

    @Override
    public TestCase createTestCase(Long projectId, TestCaseDTO dto) {
        TestCase tc = new TestCase();
        tc.setProjectId(projectId);
        tc.setName(dto.getName());
        tc.setVariablesJson(serializeVars(dto.getVariablesJson()));
        tc.setExpectedOutput(dto.getExpectedOutput());
        testCaseMapper.insert(tc);
        return tc;
    }

    @Override
    public TestCase updateTestCase(Long id, TestCaseDTO dto) {
        TestCase existing = testCaseMapper.selectById(id);
        if (existing == null) throw BizException.of(404, "测试样例不存在: " + id);
        existing.setName(dto.getName());
        existing.setVariablesJson(serializeVars(dto.getVariablesJson()));
        existing.setExpectedOutput(dto.getExpectedOutput());
        testCaseMapper.updateById(existing);
        return existing;
    }

    @Override
    public void deleteTestCase(Long id) {
        testCaseMapper.deleteById(id);
    }

    @Override
    public int importFromCsv(Long projectId, MultipartFile file) {
        List<TestCase> toInsert = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) return 0;
            String[] headers = parseCsvLine(headerLine);

            String line;
            int rowNum = 1;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] values = parseCsvLine(line);
                Map<String, String> vars = new LinkedHashMap<>();
                for (int i = 0; i < headers.length; i++) {
                    vars.put(headers[i].trim(), i < values.length ? values[i].trim() : "");
                }
                TestCase tc = new TestCase();
                tc.setProjectId(projectId);
                tc.setName("样例-" + rowNum);
                tc.setVariablesJson(serializeVars(vars));
                tc.setExpectedOutput("");
                toInsert.add(tc);
                rowNum++;
            }
        } catch (Exception e) {
            log.error("CSV import failed", e);
            throw BizException.of(400, "CSV 解析失败: " + e.getMessage());
        }
        toInsert.forEach(testCaseMapper::insert);
        return toInsert.size();
    }

    @Override
    public byte[] exportToCsv(Long projectId) {
        List<TestCase> cases = testCaseMapper.selectByProjectId(projectId);
        LinkedHashSet<String> allKeys = new LinkedHashSet<>();
        List<Map<String, String>> parsedVars = new ArrayList<>();

        for (TestCase tc : cases) {
            Map<String, String> vars = deserializeVars(tc.getVariablesJson());
            allKeys.addAll(vars.keySet());
            parsedVars.add(vars);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("name");
        for (String key : allKeys) {
            sb.append(",").append(escapeCsv(key));
        }
        sb.append(",expected_output\n");

        for (int i = 0; i < cases.size(); i++) {
            TestCase tc = cases.get(i);
            sb.append(escapeCsv(tc.getName()));
            Map<String, String> vars = parsedVars.get(i);
            for (String key : allKeys) {
                sb.append(",").append(escapeCsv(vars.getOrDefault(key, "")));
            }
            sb.append(",").append(escapeCsv(tc.getExpectedOutput() != null ? tc.getExpectedOutput() : ""));
            sb.append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private String serializeVars(Map<String, String> vars) {
        if (vars == null) return "{}";
        try {
            return objectMapper.writeValueAsString(vars);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, String> deserializeVars(String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, String>>() {});
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    /** Parse a single CSV line, handling double-quoted fields. */
    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else {
                if (c == '"') {
                    inQuotes = true;
                } else if (c == ',') {
                    fields.add(current.toString());
                    current.setLength(0);
                } else {
                    current.append(c);
                }
            }
        }
        fields.add(current.toString());
        return fields.toArray(new String[0]);
    }
}
