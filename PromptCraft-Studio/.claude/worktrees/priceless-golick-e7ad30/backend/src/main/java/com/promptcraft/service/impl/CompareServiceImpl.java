package com.promptcraft.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.promptcraft.dto.CompareCreateDTO;
import com.promptcraft.entity.CompareRecord;
import com.promptcraft.entity.PromptVersion;
import com.promptcraft.exception.BizException;
import com.promptcraft.mapper.CompareRecordMapper;
import com.promptcraft.mapper.PromptVersionMapper;
import com.promptcraft.service.CompareService;
import com.promptcraft.vo.CompareRecordVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompareServiceImpl implements CompareService {

    private final CompareRecordMapper compareRecordMapper;
    private final PromptVersionMapper versionMapper;

    @Override
    public CompareRecord createCompare(CompareCreateDTO dto) {
        if (dto.getVersionAId().equals(dto.getVersionBId())) {
            throw BizException.of(400, "不能与自身对比，请选择两个不同版本");
        }

        PromptVersion va = versionMapper.selectById(dto.getVersionAId());
        if (va == null || !va.getProjectId().equals(dto.getProjectId())) {
            throw BizException.of(400, "版本 A 不存在或不属于该项目");
        }

        PromptVersion vb = versionMapper.selectById(dto.getVersionBId());
        if (vb == null || !vb.getProjectId().equals(dto.getProjectId())) {
            throw BizException.of(400, "版本 B 不存在或不属于该项目");
        }

        CompareRecord record = new CompareRecord();
        record.setProjectId(dto.getProjectId());
        record.setVersionAId(dto.getVersionAId());
        record.setVersionBId(dto.getVersionBId());
        compareRecordMapper.insert(record);
        return record;
    }

    @Override
    public void updateWinner(Long compareId, Long winnerVersionId, String reason) {
        CompareRecord existing = compareRecordMapper.selectById(compareId);
        if (existing == null) {
            throw BizException.of(404, "对比记录不存在: " + compareId);
        }

        // Use UpdateWrapper to allow setting winnerVersionId to null (tie)
        compareRecordMapper.update(null,
                Wrappers.<CompareRecord>lambdaUpdate()
                        .eq(CompareRecord::getId, compareId)
                        .set(CompareRecord::getWinnerVersionId, winnerVersionId)
                        .set(CompareRecord::getReason, reason));
    }

    @Override
    public void linkRunRecord(Long compareId, String side, Long runRecordId) {
        CompareRecord existing = compareRecordMapper.selectById(compareId);
        if (existing == null) {
            throw BizException.of(404, "对比记录不存在: " + compareId);
        }
        if (!"a".equals(side) && !"b".equals(side)) {
            throw BizException.of(400, "side 只能是 \"a\" 或 \"b\"");
        }

        if ("a".equals(side)) {
            compareRecordMapper.update(null,
                    Wrappers.<CompareRecord>lambdaUpdate()
                            .eq(CompareRecord::getId, compareId)
                            .set(CompareRecord::getRunAId, runRecordId));
        } else {
            compareRecordMapper.update(null,
                    Wrappers.<CompareRecord>lambdaUpdate()
                            .eq(CompareRecord::getId, compareId)
                            .set(CompareRecord::getRunBId, runRecordId));
        }
    }

    @Override
    public List<CompareRecordVO> listCompares(Long projectId) {
        return compareRecordMapper.selectVOsByProjectId(projectId);
    }
}
