package com.promptcraft.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptcraft.dto.VariableSnapshotDTO;
import com.promptcraft.entity.PromptVersion;
import com.promptcraft.entity.VariableSnapshot;
import com.promptcraft.exception.BizException;
import com.promptcraft.mapper.PromptVersionMapper;
import com.promptcraft.mapper.VariableSnapshotMapper;
import com.promptcraft.service.VariableSnapshotService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VariableSnapshotServiceImpl implements VariableSnapshotService {

    private final VariableSnapshotMapper snapshotMapper;
    private final PromptVersionMapper versionMapper;
    private final ObjectMapper objectMapper;

    @Override
    public List<VariableSnapshot> listByVersion(Long versionId) {
        return snapshotMapper.selectByVersionId(versionId);
    }

    @Override
    public VariableSnapshot create(Long versionId, VariableSnapshotDTO dto) {
        PromptVersion version = versionMapper.selectById(versionId);
        if (version == null) throw BizException.of(404, "版本不存在: " + versionId);

        String json;
        try {
            json = objectMapper.writeValueAsString(
                    dto.getVariables() != null ? dto.getVariables() : Collections.emptyMap());
        } catch (Exception e) {
            throw BizException.of(400, "变量序列化失败");
        }

        VariableSnapshot snapshot = new VariableSnapshot();
        snapshot.setVersionId(versionId);
        snapshot.setName(dto.getName().trim());
        snapshot.setVariablesJson(json);
        snapshotMapper.insert(snapshot);
        return snapshot;
    }

    @Override
    public void delete(Long id) {
        snapshotMapper.deleteById(id);
    }
}
