package com.football.dto;

import lombok.Data;

@Data
public class CreateInjuryRequest {
    private Long playerId;
    private String type;
    private String returnDate;
}
