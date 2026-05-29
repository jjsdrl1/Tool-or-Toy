package com.promptcraft.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.promptcraft.dto.RunRequestDTO;
import com.promptcraft.entity.ApiPreset;
import com.promptcraft.entity.PromptVersion;
import com.promptcraft.entity.RunRecord;
import com.promptcraft.exception.BizException;
import com.promptcraft.llm.LlmClient;
import com.promptcraft.llm.LlmClientFactory;
import com.promptcraft.llm.LlmRequest;
import com.promptcraft.llm.LlmResponse;
import com.promptcraft.llm.LlmStreamStats;
import com.promptcraft.mapper.ApiPresetMapper;
import com.promptcraft.mapper.ProjectMapper;
import com.promptcraft.mapper.PromptVersionMapper;
import com.promptcraft.mapper.RunRecordMapper;
import com.promptcraft.service.PromptRunService;
import com.promptcraft.util.ApiKeyEncryptor;
import com.promptcraft.util.PromptRenderer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PromptRunServiceImpl implements PromptRunService {

    private final PromptVersionMapper versionMapper;
    private final ApiPresetMapper presetMapper;
    private final ProjectMapper projectMapper;
    private final RunRecordMapper runRecordMapper;
    private final LlmClientFactory llmClientFactory;
    private final ApiKeyEncryptor encryptor;
    private final PromptRenderer renderer;
    private final ObjectMapper objectMapper;

    // ─── SSE event type constants ─────────────────────────────────────────────

    private static final String EVT_CHUNK = "chunk";
    private static final String EVT_STATS = "stats";
    private static final String EVT_DONE  = "done";
    private static final String EVT_ERROR = "error";

    /**
     * 本地模型 provider 豁免 API Key 校验。custom 不在豁免之列——
     * 它通常指向远程 OpenAI-Compatible 服务，应当显式要求填写 Key。
     */
    private static boolean requiresApiKey(String provider) {
        if (provider == null) return true;
        String p = provider.toLowerCase();
        return !("ollama".equals(p) || "lmstudio".equals(p));
    }

    @Override
    public void streamRun(RunRequestDTO dto, SseEmitter emitter) {
        long start = System.currentTimeMillis();
        StringBuilder accumulated = new StringBuilder();

        // ── 1. Load version ───────────────────────────────────────────────────
        PromptVersion version = versionMapper.selectById(dto.getVersionId());
        if (version == null) {
            sendError(emitter, "版本不存在: " + dto.getVersionId());
            return;
        }

        // ── 2. Load preset ────────────────────────────────────────────────────
        ApiPreset preset = presetMapper.selectById(dto.getPresetId());
        if (preset == null) {
            sendError(emitter, "模型配置不存在: " + dto.getPresetId());
            return;
        }
        boolean hasKey = preset.getApiKeyEncrypted() != null && !preset.getApiKeyEncrypted().isBlank();
        if (!hasKey && requiresApiKey(preset.getProvider())) {
            sendError(emitter, "该配置未设置 API Key，请先在模型配置中填写");
            return;
        }

        // ── 3. Decrypt API key ────────────────────────────────────────────────
        String plainKey = null;
        if (hasKey) {
            try {
                plainKey = encryptor.decrypt(preset.getApiKeyEncrypted());
            } catch (Exception e) {
                sendError(emitter, "API Key 解密失败，请重新保存配置");
                return;
            }
        }

        // ── 4. Parse variables ────────────────────────────────────────────────
        Map<String, String> vars = parseVariables(dto.getVariablesJson());

        // ── 5. Render prompts ─────────────────────────────────────────────────
        String sysPrompt  = renderer.render(version.getSystemPrompt()  != null ? version.getSystemPrompt()  : "", vars);
        String userPrompt = renderer.render(version.getUserPrompt()     != null ? version.getUserPrompt()    : "", vars);

        // ── 6. Resolve base URL ───────────────────────────────────────────────
        String baseUrl = resolveBaseUrl(preset);

        // ── 7. Build LLM request ──────────────────────────────────────────────
        LlmRequest llmRequest = LlmRequest.builder()
                .provider(preset.getProvider())
                .baseUrl(baseUrl)
                .apiKey(plainKey)
                .modelName(preset.getModelName())
                .systemPrompt(sysPrompt.isBlank() ? null : sysPrompt)
                .userPrompt(userPrompt)
                .temperature(preset.getTemperature() != null ? preset.getTemperature() : new BigDecimal("0.7"))
                .maxTokens(preset.getMaxTokens() != null ? preset.getMaxTokens() : 1024)
                .build();

        // ── 8. Stream ─────────────────────────────────────────────────────────
        LlmClient client = llmClientFactory.getClient(preset.getProvider());
        LlmStreamStats stats;
        try {
            stats = client.streamChat(llmRequest, (chunk) -> {
                accumulated.append(chunk);
                try {
                    Map<String, Object> event = Map.of("type", EVT_CHUNK, "content", chunk);
                    emitter.send(SseEmitter.event().name(EVT_CHUNK).data(objectMapper.writeValueAsString(event)));
                } catch (Exception ignored) {
                    // emitter may have been closed by client
                }
            });
        } catch (Exception e) {
            log.warn("LLM streaming error: {}", e.getMessage(), e);
            long latencyMs = System.currentTimeMillis() - start;
            saveRecord(version, preset, vars, sysPrompt, userPrompt, "", 0, 0,
                    (int) latencyMs, false, e.getMessage());
            sendError(emitter, e.getMessage());
            return;
        }

        long latencyMs = System.currentTimeMillis() - start;
        String output = accumulated.toString();

        // ── 9. Send stats event ───────────────────────────────────────────────
        try {
            Map<String, Object> statsMap = new LinkedHashMap<>();
            statsMap.put("type", EVT_STATS);
            statsMap.put("inputTokens",  stats.getInputTokens());
            statsMap.put("outputTokens", stats.getOutputTokens());
            statsMap.put("latencyMs",    latencyMs);
            statsMap.put("model",        preset.getModelName());
            emitter.send(SseEmitter.event().name(EVT_STATS).data(objectMapper.writeValueAsString(statsMap)));
        } catch (Exception ignored) {}

        // ── 10. Save run record ───────────────────────────────────────────────
        RunRecord record = saveRecord(version, preset, vars, sysPrompt, userPrompt,
                output, stats.getInputTokens(), stats.getOutputTokens(),
                (int) latencyMs, true, null);

        // ── 11. Send done event ───────────────────────────────────────────────
        try {
            Map<String, Object> doneMap = Map.of("type", EVT_DONE, "runRecordId", record.getId());
            emitter.send(SseEmitter.event().name(EVT_DONE).data(objectMapper.writeValueAsString(doneMap)));
            emitter.complete();
        } catch (Exception ignored) {}
    }

    @Override
    public RunRecord runSync(RunRequestDTO dto) {
        long start = System.currentTimeMillis();

        PromptVersion version = versionMapper.selectById(dto.getVersionId());
        if (version == null) throw BizException.of(404, "版本不存在: " + dto.getVersionId());

        ApiPreset preset = presetMapper.selectById(dto.getPresetId());
        if (preset == null) throw BizException.of(404, "模型配置不存在: " + dto.getPresetId());
        boolean hasKey = preset.getApiKeyEncrypted() != null && !preset.getApiKeyEncrypted().isBlank();
        if (!hasKey && requiresApiKey(preset.getProvider())) {
            throw BizException.of(400, "该配置未设置 API Key，请先在模型配置中填写");
        }

        String plainKey = null;
        if (hasKey) {
            try {
                plainKey = encryptor.decrypt(preset.getApiKeyEncrypted());
            } catch (Exception e) {
                throw BizException.of(500, "API Key 解密失败，请重新保存配置");
            }
        }

        Map<String, String> vars = parseVariables(dto.getVariablesJson());
        String sysPrompt  = renderer.render(version.getSystemPrompt()  != null ? version.getSystemPrompt()  : "", vars);
        String userPrompt = renderer.render(version.getUserPrompt()     != null ? version.getUserPrompt()    : "", vars);
        String baseUrl    = resolveBaseUrl(preset);

        LlmRequest llmRequest = LlmRequest.builder()
                .provider(preset.getProvider())
                .baseUrl(baseUrl)
                .apiKey(plainKey)
                .modelName(preset.getModelName())
                .systemPrompt(sysPrompt.isBlank() ? null : sysPrompt)
                .userPrompt(userPrompt)
                .temperature(preset.getTemperature() != null ? preset.getTemperature() : new BigDecimal("0.7"))
                .maxTokens(preset.getMaxTokens() != null ? preset.getMaxTokens() : 1024)
                .build();

        LlmClient client = llmClientFactory.getClient(preset.getProvider());
        LlmResponse response;
        try {
            response = client.chat(llmRequest);
        } catch (Exception e) {
            log.warn("LLM sync error: {}", e.getMessage(), e);
            int latencyMs = (int)(System.currentTimeMillis() - start);
            return saveRecord(version, preset, vars, sysPrompt, userPrompt, "", 0, 0, latencyMs, false, e.getMessage());
        }

        int latencyMs = (int)(System.currentTimeMillis() - start);
        return saveRecord(version, preset, vars, sysPrompt, userPrompt,
                response.getContent(), response.getInputTokens(), response.getOutputTokens(),
                latencyMs, true, null);
    }

    @Override
    public List<RunRecord> listByProject(Long projectId) {
        return runRecordMapper.selectByProjectId(projectId);
    }

    @Override
    public List<RunRecord> listByVersion(Long versionId) {
        return runRecordMapper.selectByVersionId(versionId);
    }

    @Override
    public RunRecord getById(Long id) {
        RunRecord r = runRecordMapper.selectById(id);
        if (r == null) throw BizException.of(404, "运行记录不存在");
        return r;
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    private void sendError(SseEmitter emitter, String message) {
        try {
            Map<String, Object> err = Map.of("type", EVT_ERROR, "message", message != null ? message : "未知错误");
            emitter.send(SseEmitter.event().name(EVT_ERROR).data(objectMapper.writeValueAsString(err)));
            emitter.complete();
        } catch (Exception ignored) {}
    }

    private Map<String, String> parseVariables(String variablesJson) {
        if (variablesJson == null || variablesJson.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(variablesJson, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse variablesJson: {}", variablesJson);
            return Collections.emptyMap();
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

    private RunRecord saveRecord(PromptVersion version,
                                 ApiPreset preset,
                                 Map<String, String> vars,
                                 String renderedSys,
                                 String renderedUser,
                                 String output,
                                 int inputTokens,
                                 int outputTokens,
                                 int latencyMs,
                                 boolean success,
                                 String errorMessage) {
        int inputChars  = (renderedSys  != null ? renderedSys.length()  : 0)
                        + (renderedUser != null ? renderedUser.length() : 0);
        int outputChars = output != null ? output.length() : 0;

        String varsJson;
        try {
            varsJson = objectMapper.writeValueAsString(vars);
        } catch (Exception e) {
            varsJson = "{}";
        }

        RunRecord record = new RunRecord();
        record.setProjectId(version.getProjectId());
        record.setVersionId(version.getId());
        record.setApiPresetId(preset.getId());
        record.setVariablesJson(varsJson);
        record.setRenderedSystemPrompt(renderedSys);
        record.setRenderedUserPrompt(renderedUser);
        record.setOutputText(output);
        record.setInputChars(inputChars);
        record.setOutputChars(outputChars);
        record.setInputTokens(inputTokens);
        record.setOutputTokens(outputTokens);
        record.setLatencyMs(latencyMs);
        record.setSuccess(success);
        record.setErrorMessage(errorMessage);
        record.setModelProvider(preset.getProvider());
        record.setModelName(preset.getModelName());

        runRecordMapper.insert(record);
        return record;
    }
}
