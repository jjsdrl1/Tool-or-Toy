package com.promptcraft.service;

import com.promptcraft.dto.VersionSaveDTO;
import com.promptcraft.entity.PromptVersion;
import com.promptcraft.vo.DiffResult;
import com.promptcraft.vo.VersionVO;

import java.util.List;

public interface PromptVersionService {

    List<VersionVO> listVersions(Long projectId);

    VersionVO getVersion(Long id);

    PromptVersion saveVersion(Long projectId, VersionSaveDTO dto);

    /**
     * 更新版本状态。
     * "stable"：事务内更新 project.stable_version_id + 重置所有版本 + 设当前为 stable
     * "deprecated"（且为 stable 版本）：先清空 project.stable_version_id，再更新 status
     */
    void updateStatus(Long id, String status);

    /**
     * 设置项目的 stable 版本。校验 versionId 必须属于 projectId，否则抛 400。
     * 通过后委托给 {@link #updateStatus} 完成事务化的 stable 切换。
     */
    void setStableVersion(Long projectId, Long versionId);

    PromptVersion forkVersion(Long id);

    void deleteVersion(Long id);

    DiffResult diffVersions(Long aId, Long bId);
}
