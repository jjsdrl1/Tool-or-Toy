package com.promptcraft.llm;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class LlmRequest {

    private String provider;

    private String baseUrl;

    private String apiKey;

    private String modelName;

    private String systemPrompt;

    private String userPrompt;

    @Builder.Default
    private BigDecimal temperature = new BigDecimal("0.7");

    @Builder.Default
    private Integer maxTokens = 1024;
}
