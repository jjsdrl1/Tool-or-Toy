package com.promptcraft.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptcraft.config.AppProperties;
import com.promptcraft.dto.ApiPresetDTO;
import com.promptcraft.entity.ApiPreset;
import com.promptcraft.exception.BizException;
import com.promptcraft.mapper.ApiPresetMapper;
import com.promptcraft.service.ApiPresetService;
import com.promptcraft.util.ApiKeyEncryptor;
import com.promptcraft.vo.ApiPresetVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.ConnectException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiPresetServiceImpl implements ApiPresetService {

    private final ApiPresetMapper apiPresetMapper;
    private final ApiKeyEncryptor encryptor;
    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;

    /** Provider 列表，调用 chat/completions 时无需 API Key（与运行时豁免逻辑保持一致） */
    private static boolean providerAllowsEmptyKey(String provider) {
        if (provider == null) return false;
        String p = provider.toLowerCase();
        return "ollama".equals(p) || "lmstudio".equals(p);
    }

    @Override
    public List<ApiPresetVO> listPresets() {
        return apiPresetMapper
                .selectList(new LambdaQueryWrapper<ApiPreset>().orderByDesc(ApiPreset::getCreatedAt))
                .stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    public ApiPreset getById(Long id) {
        ApiPreset preset = apiPresetMapper.selectById(id);
        if (preset == null) throw BizException.of(404, "配置预设不存在");
        return preset;
    }

    @Override
    public ApiPreset createPreset(ApiPresetDTO dto) {
        ApiPreset preset = buildFromDto(new ApiPreset(), dto);
        apiPresetMapper.insert(preset);
        return preset;
    }

    @Override
    public ApiPreset updatePreset(Long id, ApiPresetDTO dto) {
        ApiPreset preset = getById(id);
        buildFromDto(preset, dto);
        // apiKey 为空时保留原加密值
        if (dto.getApiKey() != null && !dto.getApiKey().isBlank()) {
            preset.setApiKeyEncrypted(encryptor.encrypt(dto.getApiKey()));
        }
        apiPresetMapper.updateById(preset);
        return preset;
    }

    @Override
    public void deletePreset(Long id) {
        if (apiPresetMapper.selectById(id) == null) {
            throw BizException.of(404, "配置预设不存在");
        }
        apiPresetMapper.deleteById(id);
    }

    @Override
    public Map<String, Object> testPreset(Long id) {
        long start = System.currentTimeMillis();
        try {
            ApiPreset preset = getById(id);
            boolean hasKey = preset.getApiKeyEncrypted() != null && !preset.getApiKeyEncrypted().isBlank();
            // 本地模型（ollama / lmstudio）允许无 API Key；其他 provider 仍要求设置
            if (!hasKey && !providerAllowsEmptyKey(preset.getProvider())) {
                return buildTestResult(false, 0L, "未设置 API Key，请先在配置中填写");
            }

            String plainKey = null;
            if (hasKey) {
                try {
                    plainKey = encryptor.decrypt(preset.getApiKeyEncrypted());
                } catch (Exception e) {
                    return buildTestResult(false, 0L, "API Key 解密失败，请重新保存配置");
                }
            }

            String baseUrl  = resolveBaseUrl(preset);
            if (baseUrl == null || baseUrl.isBlank()) {
                return buildTestResult(false, 0L, "未配置 Base URL");
            }
            boolean isAnthropic = "anthropic".equalsIgnoreCase(preset.getProvider());

            String url  = isAnthropic
                    ? stripSlash(baseUrl) + "/v1/messages"
                    : stripSlash(baseUrl) + "/chat/completions";
            String body = buildTestBody(preset, isAnthropic);

            long connectTimeoutMs = appProperties.getPresetTest().getConnectTimeoutMs();
            long requestTimeoutMs = appProperties.getPresetTest().getRequestTimeoutMs();

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(requestTimeoutMs))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .header("User-Agent", "PromptCraft-Studio/1.0")
                    .POST(HttpRequest.BodyPublishers.ofString(body));

            if (isAnthropic) {
                if (plainKey != null) {
                    reqBuilder.header("x-api-key", plainKey);
                }
                reqBuilder.header("anthropic-version", "2023-06-01");
            } else if (plainKey != null) {
                // 本地模型无 Key 时不发送 Authorization 头，避免某些代理把 "Bearer null" 视作非法
                reqBuilder.header("Authorization", "Bearer " + plainKey);
            }

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                    .build();
            HttpResponse<String> response = client.send(reqBuilder.build(),
                    HttpResponse.BodyHandlers.ofString());
            long latency = System.currentTimeMillis() - start;

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return buildTestResult(true, latency, "连接成功");
            }
            String msg = parseErrorMessage(response.body());
            return buildTestResult(false, latency, "HTTP " + response.statusCode() + ": " + msg);

        } catch (HttpConnectTimeoutException e) {
            long latency = System.currentTimeMillis() - start;
            log.warn("testPreset connect timeout: {}", e.getMessage());
            return buildTestResult(false, latency,
                    "连接超时（" + appProperties.getPresetTest().getConnectTimeoutMs() + "ms），请检查 Base URL 与网络");
        } catch (HttpTimeoutException e) {
            long latency = System.currentTimeMillis() - start;
            log.warn("testPreset request timeout: {}", e.getMessage());
            return buildTestResult(false, latency,
                    "请求超时（" + appProperties.getPresetTest().getRequestTimeoutMs() + "ms），可能模型冷启动较慢，请稍后重试或调大 promptcraft.preset-test.request-timeout-ms");
        } catch (ConnectException e) {
            long latency = System.currentTimeMillis() - start;
            log.warn("testPreset connect failed: {}", e.getMessage());
            return buildTestResult(false, latency, "无法连接到服务端：" + e.getMessage());
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            log.warn("testPreset failed: {}", e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return buildTestResult(false, latency, msg);
        }
    }

    @Override
    public String getDecryptedApiKey(Long id) {
        ApiPreset preset = getById(id);
        return encryptor.decrypt(preset.getApiKeyEncrypted());
    }

    // ─── helpers ────────────────────────────────────────────────────────────────

    private ApiPreset buildFromDto(ApiPreset preset, ApiPresetDTO dto) {
        preset.setName(dto.getName());
        preset.setProvider(dto.getProvider());
        preset.setBaseUrl(dto.getBaseUrl());
        preset.setModelName(dto.getModelName());
        preset.setTemperature(dto.getTemperature() != null ? dto.getTemperature() : new BigDecimal("0.70"));
        preset.setMaxTokens(dto.getMaxTokens() != null ? dto.getMaxTokens() : 1024);
        preset.setEnabled(dto.getEnabled() != null ? dto.getEnabled() : true);
        // apiKey only on create; update path handles separately
        if (preset.getId() == null && dto.getApiKey() != null && !dto.getApiKey().isBlank()) {
            preset.setApiKeyEncrypted(encryptor.encrypt(dto.getApiKey()));
        }
        return preset;
    }

    private ApiPresetVO toVO(ApiPreset p) {
        ApiPresetVO vo = new ApiPresetVO();
        vo.setId(p.getId());
        vo.setName(p.getName());
        vo.setProvider(p.getProvider());
        vo.setBaseUrl(p.getBaseUrl());
        vo.setModelName(p.getModelName());
        vo.setTemperature(p.getTemperature());
        vo.setMaxTokens(p.getMaxTokens());
        vo.setEnabled(p.getEnabled());
        vo.setCreatedAt(p.getCreatedAt());
        vo.setUpdatedAt(p.getUpdatedAt());
        vo.setApiKeyMasked(maskKey(p.getApiKeyEncrypted()));
        return vo;
    }

    private String maskKey(String encrypted) {
        if (encrypted == null || encrypted.isBlank()) return "(未设置)";
        try {
            String plain = encryptor.decrypt(encrypted);
            if (plain == null || plain.length() < 4) return "****";
            return "****" + plain.substring(plain.length() - 4);
        } catch (Exception e) {
            return "****";
        }
    }

    private String resolveBaseUrl(ApiPreset preset) {
        if (preset.getBaseUrl() != null && !preset.getBaseUrl().isBlank()) {
            return preset.getBaseUrl();
        }
        if (preset.getProvider() == null) return "";
        return switch (preset.getProvider().toLowerCase()) {
            case "openai"      -> "https://api.openai.com/v1";
            case "anthropic"   -> "https://api.anthropic.com";
            case "deepseek"    -> "https://api.deepseek.com/v1";
            case "qwen"        -> "https://dashscope.aliyuncs.com/compatible-mode/v1";
            case "moonshot"    -> "https://api.moonshot.cn/v1";
            case "doubao"      -> "https://ark.cn-beijing.volces.com/api/v3";
            case "hunyuan"     -> "https://api.hunyuan.cloud.tencent.com/v1";
            case "zhipu"       -> "https://open.bigmodel.cn/api/paas/v4";
            case "minimax"     -> "https://api.minimax.io/v1";
            case "stepfun"     -> "https://api.stepfun.ai/step_plan/v1";
            case "siliconflow" -> "https://api.siliconflow.cn/v1";
            case "openrouter"  -> "https://openrouter.ai/api/v1";
            case "ollama"      -> "http://localhost:11434/v1";
            case "lmstudio"    -> "http://localhost:1234/v1";
            default            -> "";
        };
    }

    private String stripSlash(String url) {
        return (url != null && url.endsWith("/")) ? url.substring(0, url.length() - 1) : url;
    }

    private String buildTestBody(ApiPreset preset, boolean isAnthropic) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", preset.getModelName());
            body.put("max_tokens", 5);
            body.put("messages", List.of(Map.of("role", "user", "content", "hi")));
            if (!isAnthropic) body.put("stream", false);
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            return "{\"model\":\"" + preset.getModelName() + "\",\"max_tokens\":5,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}";
        }
    }

    private String parseErrorMessage(String body) {
        if (body == null || body.isBlank()) return "无响应体";
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = objectMapper.readValue(body, Map.class);
            Object err = map.get("error");
            if (err instanceof Map<?, ?> errMap) {
                Object msg = errMap.get("message");
                if (msg != null) return msg.toString();
            }
        } catch (Exception ignored) {}
        return body.length() > 200 ? body.substring(0, 200) : body;
    }

    private Map<String, Object> buildTestResult(boolean success, long latencyMs, String message) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("success", success);
        r.put("latencyMs", latencyMs);
        r.put("message", message);
        return r;
    }
}
