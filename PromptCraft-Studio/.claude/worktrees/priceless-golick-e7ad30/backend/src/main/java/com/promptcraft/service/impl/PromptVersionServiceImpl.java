package com.promptcraft.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.promptcraft.dto.VersionSaveDTO;
import com.promptcraft.entity.Project;
import com.promptcraft.entity.PromptVersion;
import com.promptcraft.exception.BizException;
import com.promptcraft.mapper.BatchRunItemMapper;
import com.promptcraft.mapper.BatchRunMapper;
import com.promptcraft.mapper.CompareRecordMapper;
import com.promptcraft.mapper.ProjectMapper;
import com.promptcraft.mapper.PromptVersionMapper;
import com.promptcraft.mapper.RunRecordMapper;
import com.promptcraft.mapper.VariableSnapshotMapper;
import com.promptcraft.service.PromptVersionService;
import com.promptcraft.vo.DiffResult;
import com.promptcraft.vo.VersionVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PromptVersionServiceImpl implements PromptVersionService {

    private final PromptVersionMapper versionMapper;
    private final ProjectMapper projectMapper;
    private final VariableSnapshotMapper variableSnapshotMapper;
    private final RunRecordMapper runRecordMapper;
    private final CompareRecordMapper compareRecordMapper;
    private final BatchRunMapper batchRunMapper;
    private final BatchRunItemMapper batchRunItemMapper;

    // ─── CRUD ────────────────────────────────────────────────────────────────

    @Override
    public List<VersionVO> listVersions(Long projectId) {
        return versionMapper
                .selectList(new LambdaQueryWrapper<PromptVersion>()
                        .eq(PromptVersion::getProjectId, projectId)
                        .orderByDesc(PromptVersion::getVersionNo))
                .stream()
                .map(this::toVO)
                .toList();
    }

    @Override
    public VersionVO getVersion(Long id) {
        PromptVersion v = versionMapper.selectById(id);
        if (v == null) throw BizException.of(404, "版本不存在");
        return toVO(v);
    }

    @Override
    @Transactional
    public PromptVersion saveVersion(Long projectId, VersionSaveDTO dto) {
        Project project = projectMapper.selectById(projectId);
        if (project == null) throw BizException.of(404, "项目不存在");

        Integer maxNo = versionMapper.selectMaxVersionNo(projectId);
        int nextNo = (maxNo == null ? 0 : maxNo) + 1;

        PromptVersion version = PromptVersion.builder()
                .projectId(projectId)
                .versionNo(nextNo)
                .systemPrompt(dto.getSystemPrompt())
                .userPrompt(dto.getUserPrompt())
                .note(dto.getNote())
                .status("draft")
                .build();
        versionMapper.insert(version);
        return version;
    }

    @Override
    @Transactional
    public void updateStatus(Long id, String status) {
        PromptVersion version = versionMapper.selectById(id);
        if (version == null) throw BizException.of(404, "版本不存在");
        Long projectId = version.getProjectId();

        if ("stable".equals(status)) {
            // ① 更新 project.stable_version_id（唯一真相源）
            Project project = projectMapper.selectById(projectId);
            if (project == null) throw BizException.of(404, "项目不存在");
            project.setStableVersionId(id);
            projectMapper.updateById(project);

            // ② 将该项目所有版本重置为 draft
            versionMapper.updateStatusByProjectId(projectId, "draft");

            // ③ 将本版本设为 stable
            version.setStatus("stable");
            versionMapper.updateById(version);

        } else if ("deprecated".equals(status)) {
            // 若该版本是 stable，先清除 project.stable_version_id
            Project project = projectMapper.selectById(projectId);
            if (project != null && id.equals(project.getStableVersionId())) {
                project.setStableVersionId(null);
                projectMapper.updateById(project);
            }
            version.setStatus("deprecated");
            versionMapper.updateById(version);

        } else {
            version.setStatus(status);
            versionMapper.updateById(version);
        }
    }

    @Override
    @Transactional
    public void setStableVersion(Long projectId, Long versionId) {
        if (projectId == null) throw BizException.of(400, "projectId 不能为空");
        if (versionId == null) throw BizException.of(400, "versionId 不能为空");
        PromptVersion version = versionMapper.selectById(versionId);
        if (version == null) throw BizException.of(404, "版本不存在");
        if (!projectId.equals(version.getProjectId())) {
            throw BizException.of(400, "版本不属于当前项目");
        }
        // 委托给 updateStatus 完成事务化的 stable 切换
        updateStatus(versionId, "stable");
    }

    @Override
    @Transactional
    public PromptVersion forkVersion(Long id) {
        PromptVersion original = versionMapper.selectById(id);
        if (original == null) throw BizException.of(404, "版本不存在");

        Integer maxNo = versionMapper.selectMaxVersionNo(original.getProjectId());
        int nextNo = (maxNo == null ? 0 : maxNo) + 1;

        PromptVersion forked = PromptVersion.builder()
                .projectId(original.getProjectId())
                .versionNo(nextNo)
                .systemPrompt(original.getSystemPrompt())
                .userPrompt(original.getUserPrompt())
                .note("Fork from v" + original.getVersionNo())
                .status("draft")
                .build();
        versionMapper.insert(forked);
        return forked;
    }

    @Override
    @Transactional
    public void deleteVersion(Long id) {
        PromptVersion version = versionMapper.selectById(id);
        if (version == null) throw BizException.of(404, "版本不存在");

        // stable 版本不可删除（以 project.stable_version_id 为权威）
        Project project = projectMapper.selectById(version.getProjectId());
        if (project != null && id.equals(project.getStableVersionId())) {
            throw BizException.of(400, "stable 版本不可删除");
        }
        cascadeDeleteVersion(id);
    }

    /**
     * 级联清理与单个 versionId 直接相关的所有从表数据，最后删除版本自身。
     * 调用方负责事务边界与 stable 校验。
     */
    void cascadeDeleteVersion(Long versionId) {
        // ① 批量任务先于其 item 清理
        List<Long> batchRunIds = batchRunMapper.selectIdsByVersionId(versionId);
        batchRunItemMapper.deleteByBatchRunIds(batchRunIds);
        batchRunMapper.deleteByVersionId(versionId);
        // ② 变量组快照
        variableSnapshotMapper.deleteByVersionId(versionId);
        // ③ 运行记录
        runRecordMapper.deleteByVersionId(versionId);
        // ④ 对比记录（作为 A 或 B 任意一侧出现都要清）
        compareRecordMapper.deleteByVersionId(versionId);
        // ⑤ 版本自身
        versionMapper.deleteById(versionId);
    }

    @Override
    public DiffResult diffVersions(Long aId, Long bId) {
        PromptVersion a = versionMapper.selectById(aId);
        PromptVersion b = versionMapper.selectById(bId);
        if (a == null || b == null) throw BizException.of(404, "版本不存在");

        return new DiffResult(
                computeDiff(splitLines(a.getSystemPrompt()), splitLines(b.getSystemPrompt())),
                computeDiff(splitLines(a.getUserPrompt()), splitLines(b.getUserPrompt()))
        );
    }

    // ─── LCS diff ────────────────────────────────────────────────────────────

    private List<DiffResult.DiffLine> computeDiff(List<String> a, List<String> b) {
        int m = a.size(), n = b.size();
        // Build LCS DP table
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (a.get(i - 1).equals(b.get(j - 1))) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        // Iterative backtrack (collect in reverse, then reverse)
        List<DiffResult.DiffLine> result = new ArrayList<>();
        int i = m, j = n;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && a.get(i - 1).equals(b.get(j - 1))) {
                result.add(new DiffResult.DiffLine("unchanged", a.get(i - 1)));
                i--; j--;
            } else if (j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                result.add(new DiffResult.DiffLine("added", b.get(j - 1)));
                j--;
            } else {
                result.add(new DiffResult.DiffLine("removed", a.get(i - 1)));
                i--;
            }
        }
        Collections.reverse(result);
        return result;
    }

    private List<String> splitLines(String text) {
        if (text == null || text.isEmpty()) return Collections.emptyList();
        return Arrays.asList(text.split("\n", -1));
    }

    private VersionVO toVO(PromptVersion v) {
        VersionVO vo = new VersionVO();
        BeanUtils.copyProperties(v, vo);
        return vo;
    }
}
