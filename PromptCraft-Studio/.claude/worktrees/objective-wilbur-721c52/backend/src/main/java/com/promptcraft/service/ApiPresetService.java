package com.promptcraft.service;

import com.promptcraft.dto.ApiPresetDTO;
import com.promptcraft.entity.ApiPreset;
import com.promptcraft.vo.ApiPresetVO;

import java.util.List;
import java.util.Map;

public interface ApiPresetService {

    List<ApiPresetVO> listPresets();

    ApiPreset getById(Long id);

    ApiPreset createPreset(ApiPresetDTO dto);

    ApiPreset updatePreset(Long id, ApiPresetDTO dto);

    void deletePreset(Long id);

    /** 测试配置连通性，不抛异常，返回 {success, latencyMs, message} */
    Map<String, Object> testPreset(Long id);

    /** 供 PromptRunService 调用，返回解密后的明文 API Key */
    String getDecryptedApiKey(Long id);
}
