package com.promptcraft.util;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class PromptRenderer {

    private static final Pattern VAR_PATTERN = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    /**
     * 将模板中的 {{key}} 替换为 variables.get(key)。
     * key 不存在时保留原始 {{key}} 占位符不变。
     */
    public String render(String template, Map<String, String> variables) {
        if (template == null) return null;
        if (variables == null || variables.isEmpty()) return template;

        StringBuffer sb = new StringBuffer();
        Matcher m = VAR_PATTERN.matcher(template);
        while (m.find()) {
            String key = m.group(1);
            String value = variables.get(key);
            // replaceWith 中 $ 和 \ 需转义，使用 Matcher.quoteReplacement
            m.appendReplacement(sb, value != null
                    ? Matcher.quoteReplacement(value)
                    : Matcher.quoteReplacement(m.group(0)));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
