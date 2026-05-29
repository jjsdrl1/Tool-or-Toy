package com.promptcraft.llm;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LlmStreamStats {

    private int inputTokens;

    private int outputTokens;
}
