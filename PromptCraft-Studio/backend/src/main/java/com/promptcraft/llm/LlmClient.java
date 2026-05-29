package com.promptcraft.llm;

import java.util.function.Consumer;

/**
 * Unified LLM client interface.
 * Each implementation handles a specific API format (OpenAI-compatible, Anthropic, etc.)
 */
public interface LlmClient {

    /**
     * Non-streaming chat completion. Blocks until the full response is received.
     *
     * @param request the LLM request (model, prompts, params, credentials)
     * @return the complete response with content and token counts
     * @throws Exception on connection / API / parse errors
     */
    LlmResponse chat(LlmRequest request) throws Exception;

    /**
     * Stream a chat completion. Calls {@code onChunk} for each text fragment as it arrives.
     *
     * @param request  the LLM request (model, prompts, params, credentials)
     * @param onChunk  callback invoked with each text chunk; may be called from any thread
     * @return stats (token counts) after the stream completes
     * @throws Exception on connection / API / parse errors
     */
    LlmStreamStats streamChat(LlmRequest request, Consumer<String> onChunk) throws Exception;
}
