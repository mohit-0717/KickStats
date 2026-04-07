package com.football.dto;

import lombok.Data;

@Data
public class CreateTransferRequest {
    private Long playerId;
    private Long fromTeamId;
    private Long toTeamId;
    private Double transferFee;
    private String transferDate;
    private Integer contractLength;
}
