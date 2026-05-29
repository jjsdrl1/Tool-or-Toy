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
 * Anthropic Claude streaming client.
 * Uses the Anthropic Messages API format, which differs from the OpenAI format.
 * Ref: https://docs.anthropic.com/en/api/messages-streaming
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnthropicClient implements LlmClient {

    private final ObjectMapper objectMapper;

    private static final String ANTHROPIC_VERSION = "2023-06-01";

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Override
    public LlmResponse chat(LlmRequest request) throws Exception {
        String base = request.getBaseUrl() != null && !request.getBaseUrl().isBlank()
                ? request.getBaseUrl()
                : "https://api.anthropic.com";
        String url = stripSlash(base) + "/v1/messages";

        List<Map<String, String>> messages = List.of(
                Map.of("role", "user", "content", request.getUserPrompt())
        );

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", request.getModelName());
        body.put("max_tokens", request.getMaxTokens());
        body.put("messages", messages);
        body.put("stream", false);
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            body.put("system", request.getSystemPrompt());
        }

        String bodyJson = objectMapper.writeValueAsString(body);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(180))
                .header("Content-Type", "application/json")
                .header("x-api-key", request.getApiKey())
                .header("anthropic-version", ANTHROPIC_VERSION)
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();

        long start = System.currentTimeMillis();
        HttpResponse<String> response = HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        long latencyMs = System.currentTimeMillis() - start;

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Anthropic API error HTTP " + response.statusCode() + ": " + parseError(response.body()));
        }

        JsonNode root = objectMapper.readTree(response.body());
        // content is an array: [{"type":"text","text":"..."}]
        String content = root.path("content").get(0).path("text").asText("");
        int inputTokens  = root.path("usage").path("input_tokens").asInt(0);
        int outputTokens = root.path("usage").path("output_tokens").asInt(0);

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
        String base = request.getBaseUrl() != null && !request.getBaseUrl().isBlank()
                ? request.getBaseUrl()
                : "https://api.anthropic.com";
        String url = stripSlash(base) + "/v1/messages";

        List<Map<String, String>> messages = List.of(
                Map.of("role", "user", "content", request.getUserPrompt())
        );

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", request.getModelName());
        body.put("max_tokens", request.getMaxTokens());
        body.put("messages", messages);
        body.put("stream", true);
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            body.put("system", request.getSystemPrompt());
        }

        String bodyJson = objectMapper.writeValueAsString(body);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(180))
                .header("Content-Type", "application/json")
                .header("x-api-key", request.getApiKey())
                .header("anthropic-version", ANTHROPIC_VERSION)
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();

        HttpResponse<java.io.InputStream> response =
                HTTP_CLIENT.send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            String errBody = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw new RuntimeException("Anthropic API error HTTP " + response.statusCode() + ": " + parseError(errBody));
        }

        int inputTokens = 0;
        int outputTokens = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            String currentEvent = null;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("event: ")) {
                    currentEvent = line.substring(7).trim();
                } else if (line.startsWith("data: ")) {
                    String data = line.substring(6).trim();
                    try {
                        JsonNode node = objectMapper.readTree(data);
                        String type = node.path("type").asText("");

                        switch (type) {
                            case "message_start" -> {
                                // {"type":"message_start","message":{"usage":{"input_tokens":N}}}
                                inputTokens = node.path("message").path("usage")
                                        .path("input_tokens").asInt(0);
                            }
                            case "content_block_delta" -> {
                                // {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
                                String text = node.path("delta").path("text").asText("");
                                if (!text.isEmpty()) {
                                    onChunk.accept(text);
                                }
                            }
                            case "message_delta" -> {
                                // {"type":"message_delta","usage":{"output_tokens":N}}
                                outputTokens = node.path("usage").path("output_tokens").asInt(0);
                            }
                            case "message_stop" -> {
                                // End of stream
                            }
                        }
                    } catch (Exception e) {
                        log.debug("Skipping non-JSON Anthropic SSE data: {}", data);
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
