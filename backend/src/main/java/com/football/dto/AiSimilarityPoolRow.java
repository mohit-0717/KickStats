package com.football.dto;

public record AiSimilarityPoolRow(
        long player_id,
        String player_name,
        double goals,
        double assists,
        double minutes,
        double yellow_cards,
        double red_cards
) {
}
