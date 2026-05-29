package com.promptcraft.service;

import com.promptcraft.dto.CompareCreateDTO;
import com.promptcraft.entity.CompareRecord;
import com.promptcraft.vo.CompareRecordVO;

import java.util.List;

public interface CompareService {

    /**
     * Create a new compare record.
     * Validates: versionAId != versionBId, both versions belong to projectId.
     */
    CompareRecord createCompare(CompareCreateDTO dto);

    /**
     * Set the winner version and optional reason.
     * winnerVersionId may be null (tie / no winner).
     */
    void updateWinner(Long compareId, Long winnerVersionId, String reason);

    /**
     * Link a run record to the compare (side = "a" or "b").
     */
    void linkRunRecord(Long compareId, String side, Long runRecordId);

    /**
     * List compare records for a project, enriched with version numbers.
     */
    List<CompareRecordVO> listCompares(Long projectId);
}
