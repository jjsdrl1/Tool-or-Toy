package com.promptcraft.dto;

import lombok.Data;

@Data
public class WinnerUpdateDTO {

    /** null 表示平局，不设赢家 */
    private Long winnerVersionId;

    private String reason;
}
