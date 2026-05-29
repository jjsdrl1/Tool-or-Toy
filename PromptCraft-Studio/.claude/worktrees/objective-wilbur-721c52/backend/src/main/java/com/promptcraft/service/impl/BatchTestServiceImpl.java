package com.promptcraft.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptcraft.dto.BatchRunCreateDTO;
import com.promptcraft.dto.RunRequestDTO;
import com.promptcraft.entity.BatchRun;
import com.promptcraft.entity.BatchRunItem;
import com.promptcraft.entity.RunRecord;
import com.promptcraft.entity.TestCase;
import com.promptcraft.exception.BizException;
import com.promptcraft.mapper.BatchRunItemMapper;
import com.promptcraft.mapper.BatchRunMapper;
import com.promptcraft.mapper.RunRecordMapper;
import com.promptcraft.mapper.TestCaseMapper;
import com.promptcraft.service.BatchTestService;
import com.promptcraft.service.PromptRunService;
import com.promptcraft.vo.BatchRunItemVO;
import com.promptcraft.vo.BatchRunStatusVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

@Slf4j
@Service
public class BatchTestServiceImpl implements BatchTestService {

    private final BatchRunMapper batchRunMapper;
    private final BatchRunItemMapper batchRunItemMapper;
    private final TestCaseMapper testCaseMapper;
    private final RunRecordMapper runRecordMapper;
    private final PromptRunService promptRunService;
    private final Executor batchExecutor;
    private final ObjectMapper objectMapper;

    public BatchTestServiceImpl(BatchRunMapper batchRunMapper,
                                BatchRunItemMapper batchRunItemMapper,
                                TestCaseMapper testCaseMapper,
                                RunRecordMapper runRecordMapper,
                                PromptRunService promptRunService,
                                @Qualifier("batchExecutor") Executor batchExecutor,
                                ObjectMapper objectMapper) {
        this.batchRunMapper = batchRunMapper;
        this.batchRunItemMapper = batchRunItemMapper;
        this.testCaseMapper = testCaseMapper;
        this.runRecordMapper = runRecordMapper;
        this.promptRunService = promptRunService;
        this.batchExecutor = batchExecutor;
        this.objectMapper = objectMapper;
    }

    @Override
    public BatchRun createBatchRun(BatchRunCreateDTO dto) {
        int concurrency = dto.getConcurrency() != null
                ? Math.max(1, Math.min(5, dto.getConcurrency())) : 2;

        // ① Create batch_run
        BatchRun batchRun = new BatchRun();
        batchRun.setProjectId(dto.getProjectId());
        batchRun.setVersionId(dto.getVersionId());
        batchRun.setPresetId(dto.getPresetId());
        batchRun.setStatus("pending");
        batchRun.setTotalCount(dto.getTestCaseIds().size());
        batchRun.setSuccessCount(0);
        batchRun.setFailedCount(0);
        batchRunMapper.insert(batchRun);

        // ② Create batch_run_items
        List<BatchRunItem> items = new ArrayList<>();
        for (Long testCaseId : dto.getTestCaseIds()) {
            BatchRunItem item = new BatchRunItem();
            item.setBatchRunId(batchRun.getId());
            item.setTestCaseId(testCaseId);
            item.setStatus("pending");
            batchRunItemMapper.insert(item);
            items.add(item);
        }

        // ③ Submit async execution
        final Long batchRunId = batchRun.getId();
        final Long versionId = dto.getVersionId();
        final Long presetId = dto.getPresetId();
        batchExecutor.execute(() -> executeAsync(batchRunId, items, versionId, presetId, concurrency));

        return batchRun;
    }

    @Override
    public BatchRunStatusVO getBatchRunStatus(Long id) {
        BatchRun batchRun = batchRunMapper.selectById(id);
        if (batchRun == null) throw BizException.of(404, "批量运行任务不存在: " + id);

        List<BatchRunItem> items = batchRunItemMapper.selectByBatchRunId(id);

        // Load test cases
        Map<Long, TestCase> testCaseMap = new HashMap<>();
        items.stream().map(BatchRunItem::getTestCaseId).distinct().forEach(tcId -> {
            TestCase tc = testCaseMapper.selectById(tcId);
            if (tc != null) testCaseMap.put(tcId, tc);
        });

        // Load run records for done items
        Map<Long, RunRecord> runRecordMap = new HashMap<>();
        items.stream()
                .filter(i -> i.getRunRecordId() != null)
                .map(BatchRunItem::getRunRecordId)
                .distinct()
                .forEach(rrId -> {
                    RunRecord rr = runRecordMapper.selectById(rrId);
                    if (rr != null) runRecordMap.put(rrId, rr);
                });

        BatchRunStatusVO vo = new BatchRunStatusVO();
        vo.setId(batchRun.getId());
        vo.setProjectId(batchRun.getProjectId());
        vo.setVersionId(batchRun.getVersionId());
        vo.setPresetId(batchRun.getPresetId());
        vo.setStatus(batchRun.getStatus());
        vo.setTotalCount(batchRun.getTotalCount());
        vo.setSuccessCount(batchRun.getSuccessCount());
        vo.setFailedCount(batchRun.getFailedCount());
        vo.setCreatedAt(batchRun.getCreatedAt());
        vo.setFinishedAt(batchRun.getFinishedAt());

        List<BatchRunItemVO> itemVOs = items.stream().map(item -> {
            BatchRunItemVO itemVO = new BatchRunItemVO();
            itemVO.setId(item.getId());
            itemVO.setTestCaseId(item.getTestCaseId());
            TestCase tc = testCaseMap.get(item.getTestCaseId());
            itemVO.setTestCaseName(tc != null ? tc.getName() : "已删除");
            itemVO.setStatus(item.getStatus());
            itemVO.setErrorMessage(item.getErrorMessage());
            if (item.getRunRecordId() != null) {
                RunRecord rr = runRecordMap.get(item.getRunRecordId());
                if (rr != null && rr.getOutputText() != null) {
                    String out = rr.getOutputText();
                    itemVO.setOutputSummary(out.length() > 100 ? out.substring(0, 100) : out);
                }
            }
            return itemVO;
        }).collect(Collectors.toList());

        vo.setItems(itemVOs);
        return vo;
    }

    @Override
    public List<BatchRun> listByProject(Long projectId) {
        return batchRunMapper.selectByProjectId(projectId);
    }

    @Override
    public byte[] exportBatchResultCsv(Long id) {
        BatchRun batchRun = batchRunMapper.selectById(id);
        if (batchRun == null) throw BizException.of(404, "批量运行任务不存在: " + id);

        List<BatchRunItem> items = batchRunItemMapper.selectByBatchRunId(id);

        Map<Long, TestCase> testCaseMap = new HashMap<>();
        Map<Long, RunRecord> runRecordMap = new HashMap<>();
        LinkedHashSet<String> allKeys = new LinkedHashSet<>();

        for (BatchRunItem item : items) {
            TestCase tc = testCaseMapper.selectById(item.getTestCaseId());
            if (tc != null) {
                testCaseMap.put(tc.getId(), tc);
                deserializeVars(tc.getVariablesJson()).keySet().forEach(allKeys::add);
            }
            if (item.getRunRecordId() != null) {
                RunRecord rr = runRecordMapper.selectById(item.getRunRecordId());
                if (rr != null) runRecordMap.put(item.getRunRecordId(), rr);
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("sample_name");
        for (String key : allKeys) sb.append(",").append(escapeCsv(key));
        sb.append(",output,input_tokens,output_tokens,latency_ms,success\n");

        for (BatchRunItem item : items) {
            TestCase tc = testCaseMap.get(item.getTestCaseId());
            sb.append(escapeCsv(tc != null ? tc.getName() : ""));

            Map<String, String> vars = tc != null ? deserializeVars(tc.getVariablesJson()) : Collections.emptyMap();
            for (String key : allKeys) {
                sb.append(",").append(escapeCsv(vars.getOrDefault(key, "")));
            }

            RunRecord rr = item.getRunRecordId() != null ? runRecordMap.get(item.getRunRecordId()) : null;
            sb.append(",").append(escapeCsv(rr != null && rr.getOutputText() != null ? rr.getOutputText() : ""));
            sb.append(",").append(rr != null && rr.getInputTokens() != null ? rr.getInputTokens() : "");
            sb.append(",").append(rr != null && rr.getOutputTokens() != null ? rr.getOutputTokens() : "");
            sb.append(",").append(rr != null && rr.getLatencyMs() != null ? rr.getLatencyMs() : "");
            sb.append(",").append(rr != null && rr.getSuccess() != null ? rr.getSuccess() : "");
            sb.append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    // ─── async execution ──────────────────────────────────────────────────────

    private void executeAsync(Long batchRunId, List<BatchRunItem> items,
                              Long versionId, Long presetId, int concurrency) {
        // Mark running
        BatchRun runningUpdate = new BatchRun();
        runningUpdate.setId(batchRunId);
        runningUpdate.setStatus("running");
        batchRunMapper.updateById(runningUpdate);

        // Load test cases once
        Map<Long, TestCase> testCaseMap = new HashMap<>();
        items.stream().map(BatchRunItem::getTestCaseId).distinct().forEach(tcId -> {
            TestCase tc = testCaseMapper.selectById(tcId);
            if (tc != null) testCaseMap.put(tcId, tc);
        });

        // 复用注入的 batchExecutor，避免每次批量任务新建独立线程池导致泄漏；
        // 并发度由 Semaphore 控制，确保同一批次最多 N 条样例同时运行，
        // 同时单条样例失败不影响其他样例（异常被 executeItem 内部 try/catch 吞掉）。
        Semaphore gate = new Semaphore(Math.max(1, concurrency));
        List<CompletableFuture<Void>> futures = items.stream()
                .map(item -> CompletableFuture.runAsync(() -> {
                    try {
                        gate.acquire();
                        try {
                            executeItem(item, batchRunId, versionId, presetId, testCaseMap);
                        } finally {
                            gate.release();
                        }
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        markItemFailed(item.getId(), batchRunId, "任务被中断");
                    }
                }, batchExecutor))
                .collect(Collectors.toList());

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        } catch (Exception e) {
            log.error("Batch run {} failed during execution", batchRunId, e);
        }

        // Mark done
        BatchRun doneUpdate = new BatchRun();
        doneUpdate.setId(batchRunId);
        doneUpdate.setStatus("done");
        doneUpdate.setFinishedAt(LocalDateTime.now());
        batchRunMapper.updateById(doneUpdate);
    }

    private void executeItem(BatchRunItem item, Long batchRunId,
                             Long versionId, Long presetId, Map<Long, TestCase> testCaseMap) {
        // Mark item running
        BatchRunItem runningUpdate = new BatchRunItem();
        runningUpdate.setId(item.getId());
        runningUpdate.setStatus("running");
        batchRunItemMapper.updateById(runningUpdate);

        TestCase tc = testCaseMap.get(item.getTestCaseId());
        if (tc == null) {
            markItemFailed(item.getId(), batchRunId, "测试样例不存在");
            return;
        }

        try {
            RunRequestDTO dto = new RunRequestDTO();
            dto.setVersionId(versionId);
            dto.setPresetId(presetId);
            dto.setVariablesJson(tc.getVariablesJson());

            RunRecord record = promptRunService.runSync(dto);

            BatchRunItem doneUpdate = new BatchRunItem();
            doneUpdate.setId(item.getId());
            doneUpdate.setStatus("done");
            doneUpdate.setRunRecordId(record.getId());
            batchRunItemMapper.updateById(doneUpdate);

            if (Boolean.TRUE.equals(record.getSuccess())) {
                batchRunMapper.incrementSuccess(batchRunId);
            } else {
                batchRunMapper.incrementFailed(batchRunId);
            }
        } catch (Exception e) {
            log.warn("Batch item {} failed: {}", item.getId(), e.getMessage());
            markItemFailed(item.getId(), batchRunId, e.getMessage());
        }
    }

    private void markItemFailed(Long itemId, Long batchRunId, String message) {
        BatchRunItem failedUpdate = new BatchRunItem();
        failedUpdate.setId(itemId);
        failedUpdate.setStatus("failed");
        failedUpdate.setErrorMessage(message);
        batchRunItemMapper.updateById(failedUpdate);
        batchRunMapper.incrementFailed(batchRunId);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

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
}
