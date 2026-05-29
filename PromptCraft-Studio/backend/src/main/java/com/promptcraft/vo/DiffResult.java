package com.promptcraft.vo;

import lombok.*;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DiffResult {

    private List<DiffLine> systemDiff;
    private List<DiffLine> userDiff;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DiffLine {
        /** "added" | "removed" | "unchanged" */
        private String type;
        private String content;
    }
}
