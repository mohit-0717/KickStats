package com.football.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiQueryService {

    private final JdbcTemplate jdbcTemplate;

    public List<Map<String, Object>> runSafeQuery(String sql) {
        try {
            return jdbcTemplate.queryForList(sql);
        } catch (DataAccessException exception) {
            return List.of(Map.of(
                    "error", "The AI generated an invalid query for this schema."
            ));
        }
    }
}
