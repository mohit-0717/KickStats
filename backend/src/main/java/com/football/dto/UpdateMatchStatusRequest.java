package com.football.dto;

import lombok.Data;

@Data
public class UpdateMatchStatusRequest {
    private Long matchId;
    private String status;
}
