package com.promptcraft.vo;

import lombok.Data;

@Data
public class ExportResultVO {

    private String code;

    /** Slug-ified project name used as the function name */
    private String functionName;
}
