package com.promptcraft.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmResponse {

    private String content;

    private int inputTokens;

    private int outputTokens;

    private long latencyMs;

    private String modelName;
}
