package com.football.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AiOracleResult(
        String projected_score,
        double home_win,
        double draw,
        double away_win,
        double home_lambda,
        double away_lambda,
        String confidence_band,
        String narrative,
        double total_expected_goals
) {
}
