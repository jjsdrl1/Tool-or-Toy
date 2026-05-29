package com.promptcraft.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.function.Consumer;

/**
 * OpenAI-compatible streaming client.
 * Works with: OpenAI, DeepSeek, Qwen (Alibaba), Moonshot, Ollama, LM Studio,
 * and any provider that follows the OpenAI /chat/completions SSE format.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiCompatibleClient implements LlmClient {

    private final ObjectMapper objectMapper;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Override
    public LlmResponse chat(LlmRequest request) throws Exception {
        String url = stripSlash(request.getBaseUrl()) + "/chat/completions";

        List<Map<String, String>> messages = new ArrayList<>();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            messages.add(Map.of("role", "system", "content", request.getSystemPrompt()));
        }
        messages.add(Map.of("role", "user", "content", request.getUserPrompt()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", request.getModelName());
        body.put("messages", messages);
        body.put("temperature", request.getTemperature());
        body.put("max_tokens", request.getMaxTokens());
        body.put("stream", false);

        String bodyJson = objectMapper.writeValueAsString(body);

        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(180))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson));
        // 本地模型（Ollama / LM Studio）没有 API Key 时，不发送 Authorization 头
        if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            reqBuilder.header("Authorization", "Bearer " + request.getApiKey());
        }
        HttpRequest httpRequest = reqBuilder.build();

        long start = System.currentTimeMillis();
        HttpResponse<String> response = HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        long latencyMs = System.currentTimeMillis() - start;

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("API error HTTP " + response.statusCode() + ": " + parseError(response.body()));
        }

        JsonNode root = objectMapper.readTree(response.body());
        String content = root.path("choices").get(0).path("message").path("content").asText("");
        int inputTokens  = root.path("usage").path("prompt_tokens").asInt(0);
        int outputTokens = root.path("usage").path("completion_tokens").asInt(0);

        return LlmResponse.builder()
                .content(content)
                .inputTokens(inputTokens)
                .outputTokens(outputTokens)
                .latencyMs(latencyMs)
                .modelName(request.getModelName())
                .build();
    }

    @Override
    public LlmStreamStats streamChat(LlmRequest request, Consumer<String> onChunk) throws Exception {
        String url = stripSlash(request.getBaseUrl()) + "/chat/completions";

        // Build message list
        List<Map<String, String>> messages = new ArrayList<>();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            messages.add(Map.of("role", "system", "content", request.getSystemPrompt()));
        }
        messages.add(Map.of("role", "user", "content", request.getUserPrompt()));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", request.getModelName());
        body.put("messages", messages);
        body.put("temperature", request.getTemperature());
        body.put("max_tokens", request.getMaxTokens());
        body.put("stream", true);
        body.put("stream_options", Map.of("include_usage", true)); // request token counts in stream

        String bodyJson = objectMapper.writeValueAsString(body);

        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(180))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson));
        // 本地模型（Ollama / LM Studio）没有 API Key 时，不发送 Authorization 头
        if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            reqBuilder.header("Authorization", "Bearer " + request.getApiKey());
        }
        HttpRequest httpRequest = reqBuilder.build();

        HttpResponse<java.io.InputStream> response =
                HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String errBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw new RuntimeException("API error HTTP " + response.statusCode() + ": " + parseError(errBody));
        }

        int inputTokens = 0;
        int outputTokens = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("data: ")) {
                    String data = line.substring(6).trim();
                    if ("[DONE]".equals(data)) break;
                    try {
                        JsonNode node = objectMapper.readTree(data);

                        // Extract text chunk from choices[0].delta.content
                        JsonNode choices = node.path("choices");
                        if (choices.isArray() && !choices.isEmpty()) {
                            JsonNode delta = choices.get(0).path("delta");
                            JsonNode content = delta.path("content");
                            if (!content.isMissingNode() && !content.isNull()) {
                                String text = content.asText();
                                if (!text.isEmpty()) {
                                    onChunk.accept(text);
                                }
                            }
                        }

                        // Capture usage if included
                        JsonNode usage = node.path("usage");
                        if (!usage.isMissingNode() && !usage.isNull()) {
                            inputTokens = usage.path("prompt_tokens").asInt(inputTokens);
                            outputTokens = usage.path("completion_tokens").asInt(outputTokens);
                        }
                    } catch (Exception e) {
                        log.debug("Skipping non-JSON SSE line: {}", data);
                    }
                }
            }
        }

        return new LlmStreamStats(inputTokens, outputTokens);
    }

    private String stripSlash(String url) {
        return (url != null && url.endsWith("/")) ? url.substring(0, url.length() - 1) : (url != null ? url : "");
    }

    private String parseError(String body) {
        if (body == null || body.isBlank()) return "(no response body)";
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode err = root.path("error").path("message");
            if (!err.isMissingNode()) return err.asText();
        } catch (Exception ignored) {}
        return body.length() > 300 ? body.substring(0, 300) : body;
    }
}
