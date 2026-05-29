package com.promptcraft.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.fasterxml.jackson.annotation.JsonRawValue;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("test_case")
public class TestCase {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long projectId;

    private String name;

    /** JSON string: {"role":"翻译","content":"..."} */
    private String variablesJson;

    private String expectedOutput;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    // 序列化为原始 JSON 对象（而非被引号包裹的字符串），避免前端把 JSON 字符串当成对象遍历。
    @JsonRawValue
    public String getVariablesJson() {
        return (variablesJson == null || variablesJson.isBlank()) ? "{}" : variablesJson;
    }
}
