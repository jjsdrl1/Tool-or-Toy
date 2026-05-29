package com.promptcraft.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.promptcraft.dto.ProjectDTO;
import com.promptcraft.entity.Project;
import com.promptcraft.exception.BizException;
import com.promptcraft.mapper.BatchRunItemMapper;
import com.promptcraft.mapper.BatchRunMapper;
import com.promptcraft.mapper.CompareRecordMapper;
import com.promptcraft.mapper.ProjectMapper;
import com.promptcraft.mapper.PromptVersionMapper;
import com.promptcraft.mapper.RunRecordMapper;
import com.promptcraft.mapper.TestCaseMapper;
import com.promptcraft.mapper.VariableSnapshotMapper;
import com.promptcraft.service.ProjectService;
import com.promptcraft.vo.ProjectVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectMapper projectMapper;
    private final PromptVersionMapper promptVersionMapper;
    private final VariableSnapshotMapper variableSnapshotMapper;
    private final TestCaseMapper testCaseMapper;
    private final RunRecordMapper runRecordMapper;
    private final CompareRecordMapper compareRecordMapper;
    private final BatchRunMapper batchRunMapper;
    private final BatchRunItemMapper batchRunItemMapper;

    @Override
    public List<ProjectVO> listProjects(String keyword, String tagsFilter) {
        String kw = (keyword != null && !keyword.isBlank())
                ? "%" + keyword.trim() + "%" : null;
        return projectMapper.selectProjectList(kw, tagsFilter);
    }

    @Override
    public ProjectVO getProjectById(Long id) {
        List<ProjectVO> list = projectMapper.selectProjectList(null, null);
        return list.stream()
                .filter(p -> p.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> BizException.of(404, "项目不存在"));
    }

    @Override
    public Project createProject(ProjectDTO dto) {
        long count = projectMapper.selectCount(
                new LambdaQueryWrapper<Project>().eq(Project::getName, dto.getName())
        );
        if (count > 0) {
            throw BizException.of(400, "项目名称已存在");
        }
        Project project = Project.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .tags(dto.toTagsJson())
                .build();
        projectMapper.insert(project);
        return project;
    }

    @Override
    public Project updateProject(Long id, ProjectDTO dto) {
        Project existing = projectMapper.selectById(id);
        if (existing == null) {
            throw BizException.of(404, "项目不存在");
        }
        // check name uniqueness only if name changed
        if (!existing.getName().equals(dto.getName())) {
            long count = projectMapper.selectCount(
                    new LambdaQueryWrapper<Project>().eq(Project::getName, dto.getName())
            );
            if (count > 0) {
                throw BizException.of(400, "项目名称已存在");
            }
        }
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setTags(dto.toTagsJson());
        projectMapper.updateById(existing);
        return existing;
    }

    @Override
    @Transactional
    public void deleteProject(Long id) {
        Project project = projectMapper.selectById(id);
        if (project == null) {
            throw BizException.of(404, "项目不存在");
        }
        if (project.getStableVersionId() != null) {
            throw BizException.of(400, "项目存在 stable 版本，无法删除");
        }
        // ① 项目下所有 batch_run 的 item 先删
        List<Long> batchRunIds = batchRunMapper.selectIdsByProjectId(id);
        batchRunItemMapper.deleteByBatchRunIds(batchRunIds);
        // ② 项目级别从表
        batchRunMapper.deleteByProjectId(id);
        compareRecordMapper.deleteByProjectId(id);
        runRecordMapper.deleteByProjectId(id);
        testCaseMapper.deleteByProjectId(id);
        // ③ 版本级别从表（按项目下所有 versionId 批量清理）
        List<Long> versionIds = promptVersionMapper.selectIdsByProjectId(id);
        for (Long vid : versionIds) {
            variableSnapshotMapper.deleteByVersionId(vid);
        }
        // ④ 版本本身
        promptVersionMapper.deleteByProjectId(id);
        // ⑤ 项目自身
        projectMapper.deleteById(id);
    }

    @Override
    @Transactional
    public void setStableVersion(Long projectId, Long versionId) {
        Project project = projectMapper.selectById(projectId);
        if (project == null) {
            throw BizException.of(404, "项目不存在");
        }
        project.setStableVersionId(versionId);
        projectMapper.updateById(project);
        // prompt_version.status sync deferred to Phase 2
    }
}
