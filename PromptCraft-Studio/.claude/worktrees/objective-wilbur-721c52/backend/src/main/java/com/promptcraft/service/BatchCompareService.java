package com.promptcraft.service;

import com.promptcraft.dto.BatchCompareCreateDTO;
import com.promptcraft.entity.BatchCompareGroup;
import com.promptcraft.vo.BatchCompareResultVO;

import java.util.List;

public interface BatchCompareService {

    BatchCompareGroup createCompare(BatchCompareCreateDTO dto);

    BatchCompareResultVO getCompareResult(Long groupId);

    List<BatchCompareGroup> listByProject(Long projectId);
}
