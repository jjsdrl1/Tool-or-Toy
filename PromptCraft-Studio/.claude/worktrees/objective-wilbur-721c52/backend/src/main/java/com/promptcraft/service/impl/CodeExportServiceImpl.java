package com.promptcraft.service.impl;

import com.promptcraft.dto.ExportRequestDTO;
import com.promptcraft.entity.ApiPreset;
import com.promptcraft.service.ApiPresetService;
import com.promptcraft.service.CodeExportService;
import com.promptcraft.service.ProjectService;
import com.promptcraft.service.PromptVersionService;
import com.promptcraft.util.CodeTemplateRenderer;
import com.promptcraft.util.VariableParser;
import com.promptcraft.vo.ExportResultVO;
import com.promptcraft.vo.ProjectVO;
import com.promptcraft.vo.VersionVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CodeExportServiceImpl implements CodeExportService {

    private static final Pattern VAR_PATTERN = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    private final PromptVersionService versionService;
    private final ApiPresetService presetService;
    private final ProjectService projectService;
    private final VariableParser variableParser;
    private final CodeTemplateRenderer codeTemplateRenderer;

    @Override
    public ExportResultVO export(ExportRequestDTO dto) {
        String language = dto.getLanguage() != null ? dto.getLanguage().toLowerCase() : "python";

        // ① Version
        VersionVO version = versionService.getVersion(dto.getVersionId());

        // ② Preset
        ApiPreset preset = presetService.getById(dto.getPresetId());

        // ③ Variables from both prompts
        List<String> rawVarNames = variableParser.parseFromPrompt(
                version.getSystemPrompt(), version.getUserPrompt());

        // ④ Safe parameter names
        List<String> paramNames = makeSafeParamNames(rawVarNames);

        // ⑤ Function name from project
        ProjectVO project = projectService.getProjectById(version.getProjectId());
        String functionName = slugify(project.getName());

        // ⑥ Template path
        String templatePath = resolveTemplatePath(language, preset.getProvider());

        // ⑦ Process prompts for target language
        String processedSystem;
        String processedUser;
        if ("python".equals(language)) {
            processedSystem = processForPython(version.getSystemPrompt());
            processedUser   = processForPython(version.getUserPrompt());
        } else {
            processedSystem = processForTypeScript(version.getSystemPrompt());
            processedUser   = processForTypeScript(version.getUserPrompt());
        }

        String envVarName   = resolveEnvVarName(preset.getProvider());
        String baseUrl      = resolveBaseUrl(preset);
        String temperature  = formatTemperature(preset);
        int    maxTokens    = preset.getMaxTokens() != null ? preset.getMaxTokens() : 1024;

        // ⑧ Freemarker model
        Map<String, Object> model = new HashMap<>();
        model.put("functionName",       functionName);
        model.put("paramNames",         paramNames);
        model.put("systemPrompt",       processedSystem);
        model.put("userPromptTemplate", processedUser);
        model.put("baseUrl",            baseUrl);
        model.put("modelName",          preset.getModelName() != null ? preset.getModelName() : "gpt-4o-mini");
        model.put("temperature",        temperature);
        model.put("maxTokens",          maxTokens);
        model.put("envVarName",         envVarName);

        String code = codeTemplateRenderer.render(templatePath, model);

        ExportResultVO result = new ExportResultVO();
        result.setCode(code);
        result.setFunctionName(functionName);
        return result;
    }

    @Override
    public Map<String, Object> exportJson(Long versionId, Long presetId) {
        VersionVO version = versionService.getVersion(versionId);
        ApiPreset preset  = presetService.getById(presetId);

        Map<String, Object> map = new LinkedHashMap<>();

        // version fields (safe subset)
        Map<String, Object> versionMap = new LinkedHashMap<>();
        versionMap.put("id",           version.getId());
        versionMap.put("projectId",    version.getProjectId());
        versionMap.put("versionNo",    version.getVersionNo());
        versionMap.put("systemPrompt", version.getSystemPrompt());
        versionMap.put("userPrompt",   version.getUserPrompt());
        versionMap.put("note",         version.getNote());
        versionMap.put("status",       version.getStatus());
        map.put("version", versionMap);

        // preset fields (no encrypted key)
        Map<String, Object> presetMap = new LinkedHashMap<>();
        presetMap.put("id",          preset.getId());
        presetMap.put("name",        preset.getName());
        presetMap.put("provider",    preset.getProvider());
        presetMap.put("baseUrl",     resolveBaseUrl(preset));
        presetMap.put("modelName",   preset.getModelName());
        presetMap.put("temperature", formatTemperature(preset));
        presetMap.put("maxTokens",   preset.getMaxTokens());
        map.put("preset", presetMap);

        return map;
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private String resolveTemplatePath(String language, String provider) {
        boolean isAnthropic = "anthropic".equalsIgnoreCase(provider);
        if ("python".equals(language)) {
            return isAnthropic ? "export/python_anthropic.ftl" : "export/python_openai.ftl";
        } else {
            return isAnthropic ? "export/typescript_anthropic.ftl" : "export/typescript_openai.ftl";
        }
    }

    /**
     * Slugify project name → valid Python/TS function name (lowercase, underscores, max 30 chars).
     */
    private String slugify(String name) {
        if (name == null || name.isBlank()) return "my_prompt";
        String slug = name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        if (slug.isEmpty()) return "my_prompt";
        // must not start with digit
        if (Character.isDigit(slug.charAt(0))) slug = "fn_" + slug;
        if (slug.length() > 30) {
            slug = slug.substring(0, 30).replaceAll("_+$", "");
        }
        return slug.isEmpty() ? "my_prompt" : slug;
    }

    /**
     * Convert raw variable names (from {{...}}) to safe Python/TS identifiers.
     * Names starting with a digit are replaced with var_N.
     */
    private List<String> makeSafeParamNames(List<String> rawNames) {
        List<String> result = new ArrayList<>();
        int counter = 1;
        for (String name : rawNames) {
            if (name.matches("[a-zA-Z_][a-zA-Z0-9_]*")) {
                result.add(name);
            } else {
                result.add("var_" + counter++);
            }
        }
        return result;
    }

    /** Replace {{var}} → {var} for Python f-strings, and escape special chars. */
    private String processForPython(String prompt) {
        if (prompt == null) return "";
        // Escape backslashes first
        String s = prompt.replace("\\", "\\\\");
        // Escape double quotes (template uses f"...")
        s = s.replace("\"", "\\\"");
        // Collapse newlines to \n literal (keep single-line string)
        s = s.replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "\\r");
        // Replace {{var}} → {var}
        s = s.replaceAll("\\{\\{(\\w+)\\}\\}", "{$1}");
        return s;
    }

    /** Replace {{var}} → ${var} for TypeScript template literals, escape backticks. */
    private String processForTypeScript(String prompt) {
        if (prompt == null) return "";
        // Escape backslashes
        String s = prompt.replace("\\", "\\\\");
        // Escape backticks (template literal delimiter)
        s = s.replace("`", "\\`");
        // Replace {{var}} → ${var} using Matcher to safely build replacement
        Matcher m = VAR_PATTERN.matcher(s);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(sb, Matcher.quoteReplacement("${" + m.group(1) + "}"));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String resolveEnvVarName(String provider) {
        if (provider == null || "custom".equalsIgnoreCase(provider)) return "API_KEY";
        return provider.toUpperCase() + "_API_KEY";
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

    private String formatTemperature(ApiPreset preset) {
        if (preset.getTemperature() == null) return "0.7";
        return preset.getTemperature().stripTrailingZeros().toPlainString();
    }
}
