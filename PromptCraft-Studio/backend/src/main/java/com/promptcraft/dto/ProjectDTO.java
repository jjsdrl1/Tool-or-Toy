package com.promptcraft.dto;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Collections;
import java.util.List;

@Data
public class ProjectDTO {

    @NotBlank(message = "项目名称不能为空")
    private String name;

    @NotBlank(message = "项目描述不能为空")
    private String description;

    private List<String> tags;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public String toTagsJson() {
        List<String> list = tags != null ? tags : Collections.emptyList();
        try {
            return MAPPER.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
