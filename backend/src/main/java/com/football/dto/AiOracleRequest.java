package com.football.dto;

public record AiOracleRequest(
        double home_scored_avg,
        double home_conceded_avg,
        double away_scored_avg,
        double away_conceded_avg
) {
}
