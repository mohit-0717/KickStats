package com.football.dto;

import lombok.Data;

@Data
public class QuickGoalRequest {
    private Long matchId;
    private Long teamId;
    private Long playerId;
    private Integer minute;
}
