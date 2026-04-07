// backend/src/main/java/com/football/repository/PlayerRepository.java
package com.football.repository;

import com.football.entity.Player;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Player Repository - Data access layer
 * Extends JpaRepository for CRUD operations
 * Custom query methods for advanced filtering
 * Automatic pagination and sorting support
 */
@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {

    /**
     * Find players by position with pagination
     */
    Page<Player> findByPositionIgnoreCaseOrderByGoalsDesc(String position, Pageable pageable);

    /**
     * Find players by nationality with pagination
     */
    Page<Player> findByNationalityIgnoreCaseOrderByGoalsDesc(String nationality, Pageable pageable);

    /**
     * Search players by name (first or last name)
     */
    @Query("SELECT p FROM Player p WHERE " +
            "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "ORDER BY p.goals DESC")
    Page<Player> searchByName(@Param("searchTerm") String searchTerm, Pageable pageable);

    /**
     * Find top scorers
     */
    @Query(value = "SELECT * FROM players WHERE deleted_at IS NULL ORDER BY goals DESC LIMIT :limit",
            nativeQuery = true)
    List<Player> findTopScorers(@Param("limit") int limit);

    /**
     * Find players with goals greater than minimum
     */
    @Query("SELECT p FROM Player p WHERE p.goals >= :minGoals ORDER BY p.goals DESC")
    Page<Player> findPlayersWithMinGoals(@Param("minGoals") Integer minGoals, Pageable pageable);

    /**
     * Advanced search with multiple filters
     */
    @Query("SELECT p FROM Player p WHERE " +
            "(:position IS NULL OR LOWER(p.position) = LOWER(:position)) AND " +
            "(:nationality IS NULL OR LOWER(p.nationality) = LOWER(:nationality)) AND " +
            "(:minGoals IS NULL OR p.goals >= :minGoals) AND " +
            "(:maxGoals IS NULL OR p.goals <= :maxGoals) " +
            "ORDER BY p.goals DESC")
    Page<Player> advancedSearch(
            @Param("position") String position,
            @Param("nationality") String nationality,
            @Param("minGoals") Integer minGoals,
            @Param("maxGoals") Integer maxGoals,
            Pageable pageable
    );

    /**
     * Get statistics summary
     */
    @Query(value = "SELECT " +
            "COUNT(*) as totalPlayers, " +
            "COALESCE(SUM(goals), 0) as totalGoals, " +
            "COALESCE(SUM(assists), 0) as totalAssists, " +
            "COALESCE(AVG(goals), 0) as avgGoals, " +
            "COALESCE(MAX(goals), 0) as maxGoals, " +
            "COALESCE(MIN(goals), 0) as minGoals " +
            "FROM players WHERE deleted_at IS NULL",
            nativeQuery = true)
    Object getPlayerStatistics();

    /**
     * Check if player with jersey number exists
     */
    boolean existsByJerseyNumber(Integer jerseyNumber);

    /**
     * Find player by jersey number
     */
    Optional<Player> findByJerseyNumber(Integer jerseyNumber);

    /**
     * Count total active players
     */
    @Query(value = "SELECT COUNT(*) FROM players WHERE deleted_at IS NULL", nativeQuery = true)
    long countActivePlayers();

    /**
     * Get players by position with statistics
     */
    @Query(value = "SELECT p.position, COUNT(*) as count, " +
            "COALESCE(SUM(p.goals), 0) as totalGoals, " +
            "COALESCE(AVG(p.goals), 0) as avgGoals " +
            "FROM players p " +
            "WHERE p.deleted_at IS NULL " +
            "GROUP BY p.position " +
            "ORDER BY totalGoals DESC",
            nativeQuery = true)
    List<Object> getPlayersByPositionStats();
}
