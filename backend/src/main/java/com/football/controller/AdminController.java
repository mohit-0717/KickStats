package com.football.controller;

import com.football.dto.ApiResponse;
import com.football.dto.CreateInjuryRequest;
import com.football.dto.CreateTransferRequest;
import com.football.dto.QuickGoalRequest;
import com.football.dto.UpdateFanPreferenceRequest;
import com.football.dto.UpdateMatchStatusRequest;
import com.football.service.AdminCommandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminCommandService adminCommandService;

    @GetMapping("/options")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAdminOptions() {
        return ResponseEntity.ok(ApiResponse.success(
                adminCommandService.getAdminOptions(),
                "Admin options fetched successfully"
        ));
    }

    @PutMapping("/matches/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateMatchStatus(@RequestBody UpdateMatchStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminCommandService.updateMatchStatus(request),
                "Match status updated successfully"
        ));
    }

    @PostMapping("/matches/quick-goal")
    public ResponseEntity<ApiResponse<Map<String, Object>>> recordQuickGoal(@RequestBody QuickGoalRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminCommandService.recordQuickGoal(request),
                "Quick goal recorded successfully"
        ));
    }

    @PostMapping("/injuries")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createInjury(@RequestBody CreateInjuryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminCommandService.createInjury(request),
                "Injury record created successfully"
        ));
    }

    @PostMapping("/transfers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createTransfer(@RequestBody CreateTransferRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminCommandService.createTransfer(request),
                "Transfer recorded successfully"
        ));
    }

    @PutMapping("/users/favourite-team")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateFavouriteTeam(@RequestBody UpdateFanPreferenceRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminCommandService.updateFavouriteTeam(request),
                "Fan preference updated successfully"
        ));
    }
}
