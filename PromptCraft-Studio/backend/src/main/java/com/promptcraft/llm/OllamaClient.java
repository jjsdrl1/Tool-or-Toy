package com.promptcraft.llm;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

/**
 * Ollama client. Ollama exposes an OpenAI-compatible /chat/completions endpoint,
 * so this implementation simply delegates to {@link OpenAiCompatibleClient}.
 * API key is passed as an empty string because local Ollama does not require authentication.
 */
@Component
@RequiredArgsConstructor
public class OllamaClient implements LlmClient {

    private final OpenAiCompatibleClient openAiCompatibleClient;

    @Override
    public LlmResponse chat(LlmRequest request) throws Exception {
        return openAiCompatibleClient.chat(withEmptyKey(request));
    }

    @Override
    public LlmStreamStats streamChat(LlmRequest request, Consumer<String> onChunk) throws Exception {
        return openAiCompatibleClient.streamChat(withEmptyKey(request), onChunk);
    }

    private LlmRequest withEmptyKey(LlmRequest request) {
        if (request.getApiKey() == null || request.getApiKey().isBlank()) {
            return request;
        }
        return LlmRequest.builder()
                .provider(request.getProvider())
                .baseUrl(request.getBaseUrl())
                .apiKey("")
                .modelName(request.getModelName())
                .systemPrompt(request.getSystemPrompt())
                .userPrompt(request.getUserPrompt())
                .temperature(request.getTemperature())
                .maxTokens(request.getMaxTokens())
                .build();
    }
}
