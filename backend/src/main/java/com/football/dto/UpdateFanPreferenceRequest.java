package com.football.dto;

import lombok.Data;

@Data
public class UpdateFanPreferenceRequest {
    private Long userId;
    private Long favTeamId;
}
