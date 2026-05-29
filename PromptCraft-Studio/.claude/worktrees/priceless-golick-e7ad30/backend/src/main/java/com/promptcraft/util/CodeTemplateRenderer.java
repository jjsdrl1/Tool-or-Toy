package com.promptcraft.util;

import freemarker.template.Template;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.view.freemarker.FreeMarkerConfigurer;

import java.io.StringWriter;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class CodeTemplateRenderer {

    private final FreeMarkerConfigurer freeMarkerConfigurer;

    public String render(String templatePath, Map<String, Object> model) {
        try {
            Template template = freeMarkerConfigurer.getConfiguration().getTemplate(templatePath);
            StringWriter writer = new StringWriter();
            template.process(model, writer);
            return writer.toString();
        } catch (Exception e) {
            throw new RuntimeException("模板渲染失败: " + templatePath + " — " + e.getMessage(), e);
        }
    }
}
