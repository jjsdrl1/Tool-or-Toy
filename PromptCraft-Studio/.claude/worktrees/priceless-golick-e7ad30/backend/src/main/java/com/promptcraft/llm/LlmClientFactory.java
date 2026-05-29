package com.promptcraft.llm;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Selects the appropriate {@link LlmClient} implementation based on the provider name.
 * Anthropic uses a distinct API format; all others are treated as OpenAI-compatible.
 */
@Component
@RequiredArgsConstructor
public class LlmClientFactory {

    private final OpenAiCompatibleClient openAiCompatibleClient;
    private final AnthropicClient anthropicClient;
    private final OllamaClient ollamaClient;

    public LlmClient getClient(String provider) {
        if (provider == null) return openAiCompatibleClient;
        return switch (provider.toLowerCase()) {
            case "anthropic" -> anthropicClient;
            case "ollama"    -> ollamaClient;
            // openai / azure / deepseek / qwen / moonshot / doubao / hunyuan /
            // zhipu / minimax / stepfun / siliconflow / openrouter / lmstudio / custom
            default          -> openAiCompatibleClient;
        };
    }
}
