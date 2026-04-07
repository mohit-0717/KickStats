package com.football.controller;

import com.football.dto.ApiResponse;
import com.football.service.PulseQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/pulse")
@RequiredArgsConstructor
public class PulseController {

    private final PulseQueryService pulseQueryService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success(
                pulseQueryService.getDashboard(),
                "KickStats dashboard fetched successfully"
        ));
    }

    @GetMapping("/portals/players")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPortalPlayers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "36") int size,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                pulseQueryService.getPortalPlayers(page, size, search),
                "Portal players fetched successfully"
        ));
    }

    @GetMapping("/players/{playerId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPlayerDetail(@PathVariable long playerId) {
        return ResponseEntity.ok(ApiResponse.success(
                pulseQueryService.getPlayerDetail(playerId),
                "Player detail fetched successfully"
        ));
    }

    @GetMapping("/teams/{teamId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamDetail(@PathVariable long teamId) {
        return ResponseEntity.ok(ApiResponse.success(
                pulseQueryService.getTeamDetail(teamId),
                "Team detail fetched successfully"
        ));
    }

    @GetMapping("/matches/{matchId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMatchDetail(@PathVariable long matchId) {
        return ResponseEntity.ok(ApiResponse.success(
                pulseQueryService.getMatchDetail(matchId),
                "Match detail fetched successfully"
        ));
    }
}
