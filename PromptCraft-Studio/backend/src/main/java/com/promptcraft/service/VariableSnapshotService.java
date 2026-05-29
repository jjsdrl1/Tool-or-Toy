package com.promptcraft.service;

import com.promptcraft.dto.VariableSnapshotDTO;
import com.promptcraft.entity.VariableSnapshot;

import java.util.List;

public interface VariableSnapshotService {

    List<VariableSnapshot> listByVersion(Long versionId);

    VariableSnapshot create(Long versionId, VariableSnapshotDTO dto);

    void delete(Long id);
}
