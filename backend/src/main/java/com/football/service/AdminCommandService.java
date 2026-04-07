package com.football.service;

import com.football.dto.CreateInjuryRequest;
import com.football.dto.CreateTransferRequest;
import com.football.dto.QuickGoalRequest;
import com.football.dto.UpdateFanPreferenceRequest;
import com.football.dto.UpdateMatchStatusRequest;
import com.football.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminCommandService {

    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> getAdminOptions() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("matches", jdbcTemplate.queryForList("""
                SELECT
                    m.match_id AS matchId,
                    m.stage AS stage,
                    m.status AS status,
                    m.match_date AS matchDate
                FROM matches m
                ORDER BY m.match_date DESC, m.match_id DESC
                """));
        payload.put("matchTeams", jdbcTemplate.queryForList("""
                SELECT
                    tms.match_id AS matchId,
                    t.team_id AS teamId,
                    t.team_name AS teamName
                FROM team_match_stats tms
                JOIN team t ON t.team_id = tms.team_id
                ORDER BY tms.match_id DESC, t.team_name ASC
                """));
        payload.put("players", jdbcTemplate.queryForList("""
                SELECT
                    p.player_id AS playerId,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.position AS position
                FROM player p
                ORDER BY p.last_name ASC, p.first_name ASC
                """));
        payload.put("teams", jdbcTemplate.queryForList("""
                SELECT team_id AS teamId, team_name AS teamName
                FROM team
                ORDER BY team_name ASC
                """));
        payload.put("users", jdbcTemplate.queryForList("""
                SELECT
                    user_id AS userId,
                    username AS username,
                    fav_team_id AS favTeamId
                FROM users
                ORDER BY username ASC
                """));
        payload.put("statusOptions", List.of("Scheduled", "Live", "Completed", "Postponed"));
        return payload;
    }

    @Transactional
    public Map<String, Object> updateMatchStatus(UpdateMatchStatusRequest request) {
        validateMatchExists(request.getMatchId());
        if (request.getStatus() == null || request.getStatus().isBlank()) {
            throw new IllegalArgumentException("Match status is required");
        }

        jdbcTemplate.update(
                "UPDATE matches SET status = ? WHERE match_id = ?",
                request.getStatus().trim(),
                request.getMatchId()
        );
        log.info("AUDIT action=UPDATE_MATCH_STATUS matchId={} newStatus={}",
                request.getMatchId(), request.getStatus().trim());

        return jdbcTemplate.queryForMap("""
                SELECT
                    match_id AS matchId,
                    stage,
                    status,
                    match_date AS matchDate
                FROM matches
                WHERE match_id = ?
                """, request.getMatchId());
    }

    @Transactional
    public Map<String, Object> recordQuickGoal(QuickGoalRequest request) {
        validateMatchExists(request.getMatchId());
        validateTeamStatsRow(request.getMatchId(), request.getTeamId());
        validatePlayerExists(request.getPlayerId());
        validateMatchAllowsEvents(request.getMatchId());

        Integer minute = request.getMinute();
        if (minute == null || minute < 0 || minute > 130) {
            throw new IllegalArgumentException("Minute must be between 0 and 130");
        }

        jdbcTemplate.update(
                "INSERT INTO match_events (match_id, player_id, event_type, minute) VALUES (?, ?, 'GOAL', ?)",
                request.getMatchId(),
                request.getPlayerId(),
                minute
        );

        jdbcTemplate.update(
                "UPDATE team_match_stats SET goals = COALESCE(goals, 0) + 1 WHERE match_id = ? AND team_id = ?",
                request.getMatchId(),
                request.getTeamId()
        );

        jdbcTemplate.update("""
                INSERT INTO player_stats (match_id, player_id, goals, assists, yellow_cards, red_cards, minutes_played)
                VALUES (?, ?, 1, 0, 0, 0, 0)
                ON DUPLICATE KEY UPDATE goals = COALESCE(goals, 0) + 1
                """,
                request.getMatchId(),
                request.getPlayerId()
        );
        log.info("AUDIT action=QUICK_GOAL matchId={} teamId={} playerId={} minute={}",
                request.getMatchId(), request.getTeamId(), request.getPlayerId(), minute);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("event", jdbcTemplate.queryForMap("""
                SELECT
                    me.event_id AS eventId,
                    me.match_id AS matchId,
                    me.player_id AS playerId,
                    me.event_type AS eventType,
                    me.minute AS minute
                FROM match_events me
                WHERE me.match_id = ? AND me.player_id = ? AND me.event_type = 'GOAL' AND me.minute = ?
                ORDER BY me.event_id DESC
                LIMIT 1
                """, request.getMatchId(), request.getPlayerId(), minute));
        response.put("teamStats", jdbcTemplate.queryForMap("""
                SELECT
                    match_id AS matchId,
                    team_id AS teamId,
                    goals
                FROM team_match_stats
                WHERE match_id = ? AND team_id = ?
                """, request.getMatchId(), request.getTeamId()));
        response.put("playerStats", jdbcTemplate.queryForMap("""
                SELECT
                    match_id AS matchId,
                    player_id AS playerId,
                    goals,
                    assists,
                    yellow_cards AS yellowCards,
                    red_cards AS redCards
                FROM player_stats
                WHERE match_id = ? AND player_id = ?
                """, request.getMatchId(), request.getPlayerId()));
        return response;
    }

    @Transactional
    public Map<String, Object> createInjury(CreateInjuryRequest request) {
        validatePlayerExists(request.getPlayerId());
        if (request.getType() == null || request.getType().isBlank()) {
            throw new IllegalArgumentException("Injury type is required");
        }

        LocalDate returnDate = request.getReturnDate() == null || request.getReturnDate().isBlank()
                ? null
                : LocalDate.parse(request.getReturnDate());

        jdbcTemplate.update(
                "INSERT INTO injuries (player_id, type, return_date) VALUES (?, ?, ?)",
                request.getPlayerId(),
                request.getType().trim(),
                returnDate
        );
        log.info("AUDIT action=CREATE_INJURY playerId={} type={} returnDate={}",
                request.getPlayerId(), request.getType().trim(), returnDate);

        return jdbcTemplate.queryForMap("""
                SELECT
                    injury_id AS injuryId,
                    player_id AS playerId,
                    type,
                    return_date AS returnDate
                FROM injuries
                WHERE player_id = ?
                ORDER BY injury_id DESC
                LIMIT 1
                """, request.getPlayerId());
    }

    @Transactional
    public Map<String, Object> createTransfer(CreateTransferRequest request) {
        validatePlayerExists(request.getPlayerId());
        validateTeamExists(request.getFromTeamId());
        validateTeamExists(request.getToTeamId());

        if (request.getTransferDate() == null || request.getTransferDate().isBlank()) {
            throw new IllegalArgumentException("Transfer date is required");
        }

        jdbcTemplate.update("""
                INSERT INTO transfer_history (player_id, from_team_id, to_team_id, transfer_fee, transfer_date, contract_length)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                request.getPlayerId(),
                request.getFromTeamId(),
                request.getToTeamId(),
                request.getTransferFee(),
                LocalDate.parse(request.getTransferDate()),
                request.getContractLength()
        );
        log.info("AUDIT action=CREATE_TRANSFER playerId={} fromTeamId={} toTeamId={} fee={} transferDate={} contractLength={}",
                request.getPlayerId(),
                request.getFromTeamId(),
                request.getToTeamId(),
                request.getTransferFee(),
                request.getTransferDate(),
                request.getContractLength());

        return jdbcTemplate.queryForMap("""
                SELECT
                    transfer_id AS transferId,
                    player_id AS playerId,
                    from_team_id AS fromTeamId,
                    to_team_id AS toTeamId,
                    transfer_fee AS transferFee,
                    transfer_date AS transferDate,
                    contract_length AS contractLength
                FROM transfer_history
                WHERE player_id = ?
                ORDER BY transfer_id DESC
                LIMIT 1
                """, request.getPlayerId());
    }

    @Transactional
    public Map<String, Object> updateFavouriteTeam(UpdateFanPreferenceRequest request) {
        validateUserExists(request.getUserId());
        validateTeamExists(request.getFavTeamId());

        jdbcTemplate.update(
                "UPDATE users SET fav_team_id = ? WHERE user_id = ?",
                request.getFavTeamId(),
                request.getUserId()
        );
        log.info("AUDIT action=UPDATE_FAVOURITE_TEAM userId={} favTeamId={}",
                request.getUserId(), request.getFavTeamId());

        return jdbcTemplate.queryForMap("""
                SELECT
                    u.user_id AS userId,
                    u.username AS username,
                    u.fav_team_id AS favTeamId,
                    t.team_name AS favouriteTeam
                FROM users u
                LEFT JOIN team t ON t.team_id = u.fav_team_id
                WHERE u.user_id = ?
                """, request.getUserId());
    }

    private void validateMatchExists(Long matchId) {
        if (matchId == null || !exists("SELECT COUNT(*) FROM matches WHERE match_id = ?", matchId)) {
            throw new ResourceNotFoundException("Match not found with ID: " + matchId);
        }
    }

    private void validatePlayerExists(Long playerId) {
        if (playerId == null || !exists("SELECT COUNT(*) FROM player WHERE player_id = ?", playerId)) {
            throw new ResourceNotFoundException("Player not found with ID: " + playerId);
        }
    }

    private void validateTeamExists(Long teamId) {
        if (teamId == null || !exists("SELECT COUNT(*) FROM team WHERE team_id = ?", teamId)) {
            throw new ResourceNotFoundException("Team not found with ID: " + teamId);
        }
    }

    private void validateUserExists(Long userId) {
        if (userId == null || !exists("SELECT COUNT(*) FROM users WHERE user_id = ?", userId)) {
            throw new ResourceNotFoundException("User not found with ID: " + userId);
        }
    }

    private void validateTeamStatsRow(Long matchId, Long teamId) {
        if (matchId == null || teamId == null || !exists(
                "SELECT COUNT(*) FROM team_match_stats WHERE match_id = ? AND team_id = ?",
                matchId,
                teamId
        )) {
            throw new ResourceNotFoundException("Team match stats not found for match " + matchId + " and team " + teamId);
        }
    }

    private void validateMatchAllowsEvents(Long matchId) {
        String status = jdbcTemplate.queryForObject(
                "SELECT status FROM matches WHERE match_id = ?",
                String.class,
                matchId
        );

        if (status == null) {
            throw new ResourceNotFoundException("Match not found with ID: " + matchId);
        }

        String normalized = status.trim().toLowerCase();
        if ("completed".equals(normalized) || "finished".equals(normalized)) {
            throw new IllegalArgumentException("Quick goal cannot be added to a finished match");
        }
    }

    private boolean exists(String sql, Object... args) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, args);
        return count != null && count > 0;
    }
}
