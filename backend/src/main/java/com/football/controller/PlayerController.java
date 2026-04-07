// backend/src/main/java/com/football/controller/PlayerController.java
package com.football.controller;

import com.football.dto.ApiResponse;
import com.football.dto.CreatePlayerRequest;
import com.football.dto.PlayerDTO;
import com.football.dto.PaginatedResponse;
import com.football.service.PlayerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Player REST Controller
 * Handles all HTTP requests related to players
 * Uses OpenAPI annotations for Swagger documentation
 * Consistent API response format with ApiResponse wrapper
 */
@RestController
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Players", description = "Player management endpoints")
public class PlayerController {

    private final PlayerService playerService;

    /**
     * Get all players with pagination and sorting
     */
    @GetMapping
    @Operation(summary = "Get all players", description = "Retrieve all players with pagination and sorting")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Success"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Bad request")
    })
    public ResponseEntity<ApiResponse<PaginatedResponse<PlayerDTO>>> getAllPlayers(
            @PageableDefault(size = 20, page = 0, sort = "goals", direction = Sort.Direction.DESC)
            Pageable pageable) {
        log.info("GET /api/v1/players - Fetching all players");

        PaginatedResponse<PlayerDTO> response = playerService.getAllPlayers(pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Players fetched successfully"));
    }

    /**
     * Get player by ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get player by ID", description = "Retrieve a specific player by their ID")
    public ResponseEntity<ApiResponse<PlayerDTO>> getPlayerById(
            @Parameter(description = "Player ID", required = true)
            @PathVariable Long id) {
        log.info("GET /api/v1/players/{} - Fetching player", id);

        PlayerDTO player = playerService.getPlayerById(id);
        return ResponseEntity.ok(ApiResponse.success(player, "Player fetched successfully"));
    }

    /**
     * Create new player
     */
    @PostMapping
    @Operation(summary = "Create new player", description = "Create a new player in the database")
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Player created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid input")
    })
    public ResponseEntity<ApiResponse<PlayerDTO>> createPlayer(
            @Valid @RequestBody CreatePlayerRequest request) {
        log.info("POST /api/v1/players - Creating new player: {} {}",
                request.getFirstName(), request.getLastName());

        PlayerDTO createdPlayer = playerService.createPlayer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(createdPlayer, "Player created successfully"));
    }

    /**
     * Update player
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update player", description = "Update an existing player")
    public ResponseEntity<ApiResponse<PlayerDTO>> updatePlayer(
            @Parameter(description = "Player ID", required = true)
            @PathVariable Long id,
            @Valid @RequestBody PlayerDTO playerDTO) {
        log.info("PUT /api/v1/players/{} - Updating player", id);

        PlayerDTO updatedPlayer = playerService.updatePlayer(id, playerDTO);
        return ResponseEntity.ok(ApiResponse.success(updatedPlayer, "Player updated successfully"));
    }

    /**
     * Delete player
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete player", description = "Delete a player from the database")
    public ResponseEntity<ApiResponse<Void>> deletePlayer(
            @Parameter(description = "Player ID", required = true)
            @PathVariable Long id) {
        log.info("DELETE /api/v1/players/{} - Deleting player", id);

        playerService.deletePlayer(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Player deleted successfully"));
    }

    /**
     * Search players by name
     */
    @GetMapping("/search/name")
    @Operation(summary = "Search players by name", description = "Search for players by first or last name")
    public ResponseEntity<ApiResponse<PaginatedResponse<PlayerDTO>>> searchByName(
            @Parameter(description = "Search term", required = true)
            @RequestParam String searchTerm,
            @PageableDefault(size = 20, page = 0, sort = "goals", direction = Sort.Direction.DESC)
            Pageable pageable) {
        log.info("GET /api/v1/players/search/name - Searching for: {}", searchTerm);

        PaginatedResponse<PlayerDTO> response = playerService.searchByName(searchTerm, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Search completed"));
    }

    /**
     * Filter by position
     */
    @GetMapping("/filter/position")
    @Operation(summary = "Filter by position", description = "Get players filtered by position")
    public ResponseEntity<ApiResponse<PaginatedResponse<PlayerDTO>>> filterByPosition(
            @Parameter(description = "Position (Forward, Midfielder, Defender, Goalkeeper)", required = true)
            @RequestParam String position,
            @PageableDefault(size = 20, page = 0, sort = "goals", direction = Sort.Direction.DESC)
            Pageable pageable) {
        log.info("GET /api/v1/players/filter/position - Position: {}", position);

        PaginatedResponse<PlayerDTO> response = playerService.filterByPosition(position, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Filtered successfully"));
    }

    /**
     * Filter by nationality
     */
    @GetMapping("/filter/nationality")
    @Operation(summary = "Filter by nationality", description = "Get players filtered by nationality")
    public ResponseEntity<ApiResponse<PaginatedResponse<PlayerDTO>>> filterByNationality(
            @Parameter(description = "Nationality")
            @RequestParam String nationality,
            @PageableDefault(size = 20, page = 0, sort = "goals", direction = Sort.Direction.DESC)
            Pageable pageable) {
        log.info("GET /api/v1/players/filter/nationality - Nationality: {}", nationality);

        PaginatedResponse<PlayerDTO> response = playerService.filterByNationality(nationality, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Filtered successfully"));
    }

    /**
     * Advanced search with multiple filters
     */
    @GetMapping("/search/advanced")
    @Operation(summary = "Advanced search", description = "Search players with multiple filter criteria")
    public ResponseEntity<ApiResponse<PaginatedResponse<PlayerDTO>>> advancedSearch(
            @Parameter(description = "Position")
            @RequestParam(required = false) String position,
            @Parameter(description = "Nationality")
            @RequestParam(required = false) String nationality,
            @Parameter(description = "Minimum goals")
            @RequestParam(required = false) Integer minGoals,
            @Parameter(description = "Maximum goals")
            @RequestParam(required = false) Integer maxGoals,
            @PageableDefault(size = 20, page = 0, sort = "goals", direction = Sort.Direction.DESC)
            Pageable pageable) {
        log.info("GET /api/v1/players/search/advanced");

        PaginatedResponse<PlayerDTO> response = playerService.advancedSearch(
                position, nationality, minGoals, maxGoals, pageable);
        return ResponseEntity.ok(ApiResponse.success(response, "Advanced search completed"));
    }

    /**
     * Get top scorers
     */
    @GetMapping("/stats/top-scorers")
    @Operation(summary = "Get top scorers", description = "Get top N scorers in the league")
    public ResponseEntity<ApiResponse<List<PlayerDTO>>> getTopScorers(
            @Parameter(description = "Limit")
            @RequestParam(defaultValue = "10") int limit) {
        log.info("GET /api/v1/players/stats/top-scorers - Limit: {}", limit);

        List<PlayerDTO> topScorers = playerService.getTopScorers(limit);
        return ResponseEntity.ok(ApiResponse.success(topScorers, "Top scorers fetched"));
    }

    /**
     * Get player statistics
     */
    @GetMapping("/stats/summary")
    @Operation(summary = "Get player statistics", description = "Get overall player statistics")
    public ResponseEntity<ApiResponse<Object>> getPlayerStatistics() {
        log.info("GET /api/v1/players/stats/summary");

        Object stats = playerService.getPlayerStatistics();
        return ResponseEntity.ok(ApiResponse.success(stats, "Statistics fetched"));
    }

    /**
     * Get total players count
     */
    @GetMapping("/stats/count")
    @Operation(summary = "Get total players count", description = "Get total number of active players")
    public ResponseEntity<ApiResponse<Long>> getTotalPlayersCount() {
        log.info("GET /api/v1/players/stats/count");

        long count = playerService.getTotalPlayersCount();
        return ResponseEntity.ok(ApiResponse.success(count, "Player count fetched"));
    }
}