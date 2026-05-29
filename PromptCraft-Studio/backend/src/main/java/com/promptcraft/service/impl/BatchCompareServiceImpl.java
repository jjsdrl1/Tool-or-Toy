package com.promptcraft.service.impl;

import com.promptcraft.dto.BatchCompareCreateDTO;
import com.promptcraft.dto.BatchRunCreateDTO;
import com.promptcraft.entity.ApiPreset;
import com.promptcraft.entity.BatchCompareGroup;
import com.promptcraft.entity.BatchRun;
import com.promptcraft.entity.BatchRunItem;
import com.promptcraft.entity.PromptVersion;
import com.promptcraft.entity.RunRecord;
import com.promptcraft.entity.TestCase;
import com.promptcraft.exception.BizException;
import com.promptcraft.mapper.*;
import com.promptcraft.service.BatchCompareService;
import com.promptcraft.service.BatchTestService;
import com.promptcraft.vo.BatchCompareResultVO;
import com.promptcraft.vo.BatchCompareResultVO.CellResult;
import com.promptcraft.vo.BatchCompareResultVO.CompareColumn;
import com.promptcraft.vo.BatchCompareResultVO.CompareRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BatchCompareServiceImpl implements BatchCompareService {

    private final BatchCompareGroupMapper compareGroupMapper;
    private final BatchRunMapper batchRunMapper;
    private final BatchRunItemMapper batchRunItemMapper;
    private final PromptVersionMapper promptVersionMapper;
    private final ApiPresetMapper apiPresetMapper;
    private final TestCaseMapper testCaseMapper;
    private final RunRecordMapper runRecordMapper;
    private final BatchTestService batchTestService;

    @Override
    public BatchCompareGroup createCompare(BatchCompareCreateDTO dto) {
        String mode = dto.getMode();
        if (!"compare_versions".equals(mode) && !"compare_presets".equals(mode)) {
            throw BizException.of(400, "mode 必须为 compare_versions 或 compare_presets");
        }

        List<Long> versionIds;
        List<Long> presetIds;
        String name;

        if ("compare_versions".equals(mode)) {
            if (dto.getFixedPresetId() == null) throw BizException.of(400, "compare_versions 模式需要 fixedPresetId");
            if (dto.getVersionIds() == null || dto.getVersionIds().size() < 2)
                throw BizException.of(400, "compare_versions 模式至少选择 2 个版本");
            versionIds = dto.getVersionIds();
            presetIds = List.of(dto.getFixedPresetId());
            ApiPreset preset = apiPresetMapper.selectById(dto.getFixedPresetId());
            name = "Prompt对比 · " + (preset != null ? preset.getName() : "Preset#" + dto.getFixedPresetId());
        } else {
            if (dto.getFixedVersionId() == null) throw BizException.of(400, "compare_presets 模式需要 fixedVersionId");
            if (dto.getPresetIds() == null || dto.getPresetIds().size() < 2)
                throw BizException.of(400, "compare_presets 模式至少选择 2 个模型");
            versionIds = List.of(dto.getFixedVersionId());
            presetIds = dto.getPresetIds();
            PromptVersion version = promptVersionMapper.selectById(dto.getFixedVersionId());
            name = "模型对比 · v" + (version != null ? version.getVersionNo() : dto.getFixedVersionId());
        }

        BatchCompareGroup group = new BatchCompareGroup();
        group.setProjectId(dto.getProjectId());
        group.setMode(mode);
        group.setStatus("running");
        group.setName(name);
        compareGroupMapper.insert(group);

        for (Long versionId : versionIds) {
            for (Long presetId : presetIds) {
                BatchRunCreateDTO batchDto = new BatchRunCreateDTO();
                batchDto.setProjectId(dto.getProjectId());
                batchDto.setVersionId(versionId);
                batchDto.setPresetId(presetId);
                batchDto.setTestCaseIds(dto.getTestCaseIds());
                batchDto.setConcurrency(dto.getConcurrency());

                BatchRun batchRun = batchTestService.createBatchRun(batchDto);

                BatchRun update = new BatchRun();
                update.setId(batchRun.getId());
                update.setCompareGroupId(group.getId());
                batchRunMapper.updateById(update);
            }
        }

        return group;
    }

    @Override
    public BatchCompareResultVO getCompareResult(Long groupId) {
        BatchCompareGroup group = compareGroupMapper.selectById(groupId);
        if (group == null) throw BizException.of(404, "对比组不存在: " + groupId);

        List<BatchRun> runs = batchRunMapper.selectByCompareGroupId(groupId);

        boolean allDone = runs.stream().allMatch(r -> "done".equals(r.getStatus()) || "failed".equals(r.getStatus()));
        if (allDone && !"done".equals(group.getStatus()) && !"failed".equals(group.getStatus())) {
            group.setStatus("done");
            group.setFinishedAt(LocalDateTime.now());
            compareGroupMapper.updateById(group);
        }

        Set<Long> allTestCaseIds = new LinkedHashSet<>();
        Map<Long, List<BatchRunItem>> runItemsMap = new LinkedHashMap<>();
        for (BatchRun run : runs) {
            List<BatchRunItem> items = batchRunItemMapper.selectByBatchRunId(run.getId());
            runItemsMap.put(run.getId(), items);
            items.forEach(item -> allTestCaseIds.add(item.getTestCaseId()));
        }

        Map<Long, TestCase> testCaseMap = new HashMap<>();
        allTestCaseIds.forEach(tcId -> {
            TestCase tc = testCaseMapper.selectById(tcId);
            if (tc != null) testCaseMap.put(tcId, tc);
        });

        Map<Long, PromptVersion> versionMap = new HashMap<>();
        Map<Long, ApiPreset> presetMap = new HashMap<>();
        runs.forEach(r -> {
            if (!versionMap.containsKey(r.getVersionId())) {
                PromptVersion v = promptVersionMapper.selectById(r.getVersionId());
                if (v != null) versionMap.put(v.getId(), v);
            }
            if (!presetMap.containsKey(r.getPresetId())) {
                ApiPreset p = apiPresetMapper.selectById(r.getPresetId());
                if (p != null) presetMap.put(p.getId(), p);
            }
        });

        Set<Long> runRecordIds = new HashSet<>();
        runItemsMap.values().forEach(items ->
                items.stream().filter(i -> i.getRunRecordId() != null)
                        .forEach(i -> runRecordIds.add(i.getRunRecordId())));
        Map<Long, RunRecord> runRecordMap = new HashMap<>();
        runRecordIds.forEach(rrId -> {
            RunRecord rr = runRecordMapper.selectById(rrId);
            if (rr != null) runRecordMap.put(rrId, rr);
        });

        List<CompareColumn> columns = runs.stream().map(run -> {
            CompareColumn col = new CompareColumn();
            col.setBatchRunId(run.getId());
            col.setVersionId(run.getVersionId());
            PromptVersion v = versionMap.get(run.getVersionId());
            col.setVersionLabel(v != null ? "v" + v.getVersionNo() : "v?");
            col.setPresetId(run.getPresetId());
            ApiPreset p = presetMap.get(run.getPresetId());
            col.setPresetLabel(p != null ? p.getName() + " (" + p.getModelName() + ")" : "Preset#" + run.getPresetId());
            col.setStatus(run.getStatus());
            col.setSuccessCount(run.getSuccessCount());
            col.setFailedCount(run.getFailedCount());
            col.setTotalCount(run.getTotalCount());
            return col;
        }).collect(Collectors.toList());

        List<CompareRow> rows = allTestCaseIds.stream().map(tcId -> {
            CompareRow row = new CompareRow();
            row.setTestCaseId(tcId);
            TestCase tc = testCaseMap.get(tcId);
            row.setTestCaseName(tc != null ? tc.getName() : "已删除");

            List<CellResult> cells = runs.stream().map(run -> {
                CellResult cell = new CellResult();
                cell.setBatchRunId(run.getId());

                List<BatchRunItem> items = runItemsMap.get(run.getId());
                BatchRunItem matchItem = items != null
                        ? items.stream().filter(i -> i.getTestCaseId().equals(tcId)).findFirst().orElse(null)
                        : null;

                if (matchItem == null) {
                    cell.setStatus("pending");
                } else {
                    cell.setStatus(matchItem.getStatus());
                    cell.setErrorMessage(matchItem.getErrorMessage());
                    if (matchItem.getRunRecordId() != null) {
                        RunRecord rr = runRecordMap.get(matchItem.getRunRecordId());
                        if (rr != null) {
                            String out = rr.getOutputText();
                            cell.setOutputSummary(out != null && out.length() > 200 ? out.substring(0, 200) : out);
                            cell.setInputTokens(rr.getInputTokens());
                            cell.setOutputTokens(rr.getOutputTokens());
                            cell.setLatencyMs(rr.getLatencyMs());
                        }
                    }
                }
                return cell;
            }).collect(Collectors.toList());

            row.setCells(cells);
            return row;
        }).collect(Collectors.toList());

        BatchCompareResultVO vo = new BatchCompareResultVO();
        vo.setId(group.getId());
        vo.setProjectId(group.getProjectId());
        vo.setMode(group.getMode());
        vo.setStatus(group.getStatus());
        vo.setName(group.getName());
        vo.setCreatedAt(group.getCreatedAt());
        vo.setFinishedAt(group.getFinishedAt());
        vo.setColumns(columns);
        vo.setRows(rows);
        return vo;
    }

    @Override
    public List<BatchCompareGroup> listByProject(Long projectId) {
        return compareGroupMapper.selectByProjectId(projectId);
    }
}
