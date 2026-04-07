package com.football.dto;

import java.util.List;

public record AiSimilarityRequest(
        long target_id,
        List<AiSimilarityPoolRow> pool
) {
}
