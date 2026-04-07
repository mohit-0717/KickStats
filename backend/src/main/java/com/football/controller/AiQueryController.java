package com.football.controller;

import com.football.service.AiQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://localhost:5174",
        "https://mohit-0717.github.io"
})
@RequiredArgsConstructor
public class AiQueryController {

    private static final List<String> FORBIDDEN_KEYWORDS = List.of(
            "DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE", "ALTER", "GRANT", "REPLACE", "CREATE"
    );

    private final AiQueryService aiQueryService;

    @PostMapping("/execute-sql")
    public ResponseEntity<?> executePulseQuery(@RequestBody Map<String, String> request) {
        String sql = request.getOrDefault("sql", "").trim();
        String upperSql = sql.toUpperCase(Locale.ROOT);

        if (!isSafeSelect(upperSql)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Security Violation: Unauthorized query detected."));
        }

        List<Map<String, Object>> results = aiQueryService.runSafeQuery(sql);
        return ResponseEntity.ok(results);
    }

    private boolean isSafeSelect(String sql) {
        if (!sql.startsWith("SELECT")) {
            return false;
        }

        if (FORBIDDEN_KEYWORDS.stream().anyMatch(sql::contains)) {
            return false;
        }

        return !sql.contains(";");
    }
}
