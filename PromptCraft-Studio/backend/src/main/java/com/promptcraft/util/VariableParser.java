package com.promptcraft.util;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class VariableParser {

    private static final Pattern VAR_PATTERN = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    /** 从单段文本中提取变量名，去重，保持首次出现顺序 */
    public List<String> parseVariables(String text) {
        if (text == null || text.isBlank()) return List.of();
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        Matcher m = VAR_PATTERN.matcher(text);
        while (m.find()) seen.add(m.group(1));
        return new ArrayList<>(seen);
    }

    /** 合并 systemPrompt + userPrompt 后提取变量名（systemPrompt 可为 null） */
    public List<String> parseFromPrompt(String systemPrompt, String userPrompt) {
        String combined = (systemPrompt != null ? systemPrompt : "") + " " + (userPrompt != null ? userPrompt : "");
        return parseVariables(combined);
    }
}
