// backend/src/main/java/com/football/service/PlayerService.java
package com.football.service;

import com.football.dto.CreatePlayerRequest;
import com.football.dto.PlayerDTO;
import com.football.dto.PaginatedResponse;
import com.football.entity.Player;
import com.football.exception.ResourceNotFoundException;
import com.football.mapper.PlayerMapper;
import com.football.repository.PlayerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Player Service - Business logic layer
 * Handles all player-related operations
 * Transaction management with @Transactional
 * Logging for debugging and monitoring
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final PlayerMapper playerMapper;

    /**
     * Get all players with pagination and sorting
     */
    public PaginatedResponse<PlayerDTO> getAllPlayers(Pageable pageable) {
        log.info("Fetching all players with pagination: page={}, size={}",
                pageable.getPageNumber(), pageable.getPageSize());

        Page<Player> page = playerRepository.findAll(pageable);
        return toPaginatedResponse(page);
    }

    /**
     * Get player by ID
     */
    public PlayerDTO getPlayerById(Long id) {
        log.info("Fetching player with ID: {}", id);

        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Player not found with ID: " + id));

        return playerMapper.toDTO(player);
    }

    /**
     * Create new player
     */
    public PlayerDTO createPlayer(CreatePlayerRequest request) {
        log.info("Creating new player: {} {}", request.getFirstName(), request.getLastName());

        // Check jersey number uniqueness
        if (request.getJerseyNumber() != null &&
                playerRepository.existsByJerseyNumber(request.getJerseyNumber())) {
            throw new IllegalArgumentException("Jersey number already in use");
        }

        Player player = playerMapper.toEntity(request);
        Player savedPlayer = playerRepository.save(player);

        log.info("Player created successfully with ID: {}", savedPlayer.getPlayerId());
        return playerMapper.toDTO(savedPlayer);
    }

    /**
     * Update player
     */
    public PlayerDTO updatePlayer(Long id, PlayerDTO dto) {
        log.info("Updating player with ID: {}", id);

        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Player not found with ID: " + id));

        // Check jersey number uniqueness if changed
        if (dto.getJerseyNumber() != null &&
                !dto.getJerseyNumber().equals(player.getJerseyNumber()) &&
                playerRepository.existsByJerseyNumber(dto.getJerseyNumber())) {
            throw new IllegalArgumentException("Jersey number already in use");
        }

        playerMapper.updateEntity(dto, player);
        Player updatedPlayer = playerRepository.save(player);

        log.info("Player updated successfully: {}", id);
        return playerMapper.toDTO(updatedPlayer);
    }

    /**
     * Delete player (soft delete)
     */
    public void deletePlayer(Long id) {
        log.info("Deleting player with ID: {}", id);

        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Player not found with ID: " + id));

        playerRepository.delete(player);
        log.info("Player deleted successfully: {}", id);
    }

    /**
     * Search players by name
     */
    public PaginatedResponse<PlayerDTO> searchByName(String searchTerm, Pageable pageable) {
        log.info("Searching players by name: {}", searchTerm);

        Page<Player> page = playerRepository.searchByName(searchTerm, pageable);
        return toPaginatedResponse(page);
    }

    /**
     * Filter players by position
     */
    public PaginatedResponse<PlayerDTO> filterByPosition(String position, Pageable pageable) {
        log.info("Filtering players by position: {}", position);

        Page<Player> page = playerRepository.findByPositionIgnoreCaseOrderByGoalsDesc(position, pageable);
        return toPaginatedResponse(page);
    }

    /**
     * Filter players by nationality
     */
    public PaginatedResponse<PlayerDTO> filterByNationality(String nationality, Pageable pageable) {
        log.info("Filtering players by nationality: {}", nationality);

        Page<Player> page = playerRepository.findByNationalityIgnoreCaseOrderByGoalsDesc(nationality, pageable);
        return toPaginatedResponse(page);
    }

    /**
     * Advanced search with multiple filters
     */
    public PaginatedResponse<PlayerDTO> advancedSearch(String position, String nationality,
                                                       Integer minGoals, Integer maxGoals,
                                                       Pageable pageable) {
        log.info("Advanced search: position={}, nationality={}, minGoals={}, maxGoals={}",
                position, nationality, minGoals, maxGoals);

        Page<Player> page = playerRepository.advancedSearch(position, nationality, minGoals, maxGoals, pageable);
        return toPaginatedResponse(page);
    }

    /**
     * Get top scorers
     */
    public List<PlayerDTO> getTopScorers(int limit) {
        log.info("Fetching top {} scorers", limit);

        return playerRepository.findTopScorers(limit)
                .stream()
                .map(playerMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get player statistics
     */
    @Transactional(readOnly = true)
    public Object getPlayerStatistics() {
        log.info("Fetching player statistics");
        return playerRepository.getPlayerStatistics();
    }

    /**
     * Get total active players count
     */
    @Transactional(readOnly = true)
    public long getTotalPlayersCount() {
        return playerRepository.countActivePlayers();
    }

    /**
     * Helper method to convert Page to PaginatedResponse
     */
    private PaginatedResponse<PlayerDTO> toPaginatedResponse(Page<Player> page) {
        return PaginatedResponse.<PlayerDTO>builder()
                .content(page.getContent().stream()
                        .map(playerMapper::toDTO)
                        .collect(Collectors.toList()))
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }
}
