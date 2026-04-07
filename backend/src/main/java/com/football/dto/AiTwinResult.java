package com.football.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiTwinResult(
        long player_id,
        double score,
        List<String> explanations
) {
}
