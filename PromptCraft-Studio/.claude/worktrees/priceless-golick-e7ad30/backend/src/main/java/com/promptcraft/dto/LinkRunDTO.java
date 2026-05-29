package com.promptcraft.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LinkRunDTO {

    @NotNull
    @Pattern(regexp = "^[ab]$", message = "side 只能是 \"a\" 或 \"b\"")
    private String side;

    @NotNull(message = "runRecordId 不能为空")
    private Long runRecordId;
}
