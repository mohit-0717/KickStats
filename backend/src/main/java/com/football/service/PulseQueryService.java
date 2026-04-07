package com.football.service;

import com.football.dto.AiOracleRequest;
import com.football.dto.AiOracleResult;
import com.football.dto.AiSimilarityPoolRow;
import com.football.dto.AiSimilarityRequest;
import com.football.dto.AiTwinResult;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PulseQueryService {

    private final JdbcTemplate jdbcTemplate;
    private final WebClient aiWebClient;

    public Map<String, Object> getDashboard() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("generatedAt", Instant.now().toString());
        payload.put("landing", buildLandingSection());
        payload.put("matchCenter", buildMatchCenterSection());
        payload.put("portals", buildPortalsSection());
        payload.put("fanCave", buildFanCaveSection());
        return payload;
    }

    public Map<String, Object> getPortalPlayers(int page, int size, String searchTerm) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 60));
        int offset = safePage * safeSize;
        String normalizedSearch = Objects.toString(searchTerm, "").trim();
        boolean hasSearch = !normalizedSearch.isBlank();
        String likeValue = "%" + normalizedSearch + "%";

        String baseFromClause = """
                FROM player p
                LEFT JOIN media_assets ma ON ma.entity_type = 'PLAYER' AND ma.entity_id = p.player_id
                LEFT JOIN player_stats ps ON ps.player_id = p.player_id
                LEFT JOIN (
                    SELECT th1.player_id, th1.to_team_id
                    FROM transfer_history th1
                    JOIN (
                        SELECT player_id, MAX(transfer_date) AS latest_transfer
                        FROM transfer_history
                        GROUP BY player_id
                    ) latest ON latest.player_id = th1.player_id AND latest.latest_transfer = th1.transfer_date
                ) latest_transfer ON latest_transfer.player_id = p.player_id
                LEFT JOIN team latest_team ON latest_team.team_id = latest_transfer.to_team_id
                LEFT JOIN (
                    SELECT DISTINCT player_id
                    FROM injuries
                    WHERE return_date IS NULL OR return_date >= CURDATE()
                ) inj ON inj.player_id = p.player_id
                """;

        String whereClause = hasSearch
                ? """
                WHERE LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER(?)
                   OR LOWER(p.position) LIKE LOWER(?)
                   OR LOWER(p.nationality) LIKE LOWER(?)
                   OR LOWER(COALESCE(latest_team.team_name, '')) LIKE LOWER(?)
                   OR LOWER(COALESCE(p.preferred_foot, '')) LIKE LOWER(?)
                """
                : "";

        Long totalCount = hasSearch
                ? jdbcTemplate.queryForObject("""
                        SELECT COUNT(*)
                        FROM player p
                        LEFT JOIN (
                            SELECT th1.player_id, th1.to_team_id
                            FROM transfer_history th1
                            JOIN (
                                SELECT player_id, MAX(transfer_date) AS latest_transfer
                                FROM transfer_history
                                GROUP BY player_id
                            ) latest ON latest.player_id = th1.player_id AND latest.latest_transfer = th1.transfer_date
                        ) latest_transfer ON latest_transfer.player_id = p.player_id
                        LEFT JOIN team latest_team ON latest_team.team_id = latest_transfer.to_team_id
                        WHERE LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER(?)
                           OR LOWER(p.position) LIKE LOWER(?)
                           OR LOWER(p.nationality) LIKE LOWER(?)
                           OR LOWER(COALESCE(latest_team.team_name, '')) LIKE LOWER(?)
                           OR LOWER(COALESCE(p.preferred_foot, '')) LIKE LOWER(?)
                        """, Long.class, likeValue, likeValue, likeValue, likeValue, likeValue)
                : jdbcTemplate.queryForObject("SELECT COUNT(*) FROM player", Long.class);

        List<Map<String, Object>> items = hasSearch
                ? jdbcTemplate.queryForList("""
                        SELECT
                            p.player_id AS playerId,
                            CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                            p.position AS position,
                            p.nationality AS nationality,
                            p.preferred_foot AS preferredFoot,
                            p.height AS height,
                            p.weight AS weight,
                            TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) AS age,
                            ma.url AS imageUrl,
                            latest_team.team_name AS currentTeam,
                            COUNT(ps.match_id) AS matchesTracked,
                            COALESCE(SUM(ps.goals), 0) AS totalGoals,
                            COALESCE(SUM(ps.assists), 0) AS totalAssists,
                            COALESCE(SUM(ps.minutes_played), 0) AS totalMinutes,
                            COALESCE(AVG(ps.minutes_played), 0) AS avgMinutes,
                            COALESCE(SUM(ps.yellow_cards), 0) AS totalYellowCards,
                            COALESCE(SUM(ps.red_cards), 0) AS totalRedCards,
                            CASE
                                WHEN COUNT(ps.match_id) = 0 THEN 0
                                ELSE ROUND((COALESCE(SUM(ps.goals), 0) * 4 + COALESCE(SUM(ps.assists), 0) * 3 + COUNT(ps.match_id)) / COUNT(ps.match_id), 2)
                            END AS formIndex,
                            CASE
                                WHEN inj.player_id IS NULL THEN 'Available'
                                ELSE 'Injured'
                            END AS availabilityStatus
                        """ + baseFromClause + whereClause + """
                        GROUP BY p.player_id, p.first_name, p.last_name, p.position, p.nationality,
                                 p.preferred_foot, p.height, p.weight, p.dob, ma.url, latest_team.team_name,
                                 inj.player_id
                        ORDER BY formIndex DESC, totalGoals DESC, p.last_name ASC
                        LIMIT ? OFFSET ?
                        """,
                        likeValue, likeValue, likeValue, likeValue, likeValue, safeSize, offset)
                : jdbcTemplate.queryForList("""
                        SELECT
                            p.player_id AS playerId,
                            CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                            p.position AS position,
                            p.nationality AS nationality,
                            p.preferred_foot AS preferredFoot,
                            p.height AS height,
                            p.weight AS weight,
                            TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) AS age,
                            ma.url AS imageUrl,
                            latest_team.team_name AS currentTeam,
                            COUNT(ps.match_id) AS matchesTracked,
                            COALESCE(SUM(ps.goals), 0) AS totalGoals,
                            COALESCE(SUM(ps.assists), 0) AS totalAssists,
                            COALESCE(SUM(ps.minutes_played), 0) AS totalMinutes,
                            COALESCE(AVG(ps.minutes_played), 0) AS avgMinutes,
                            COALESCE(SUM(ps.yellow_cards), 0) AS totalYellowCards,
                            COALESCE(SUM(ps.red_cards), 0) AS totalRedCards,
                            CASE
                                WHEN COUNT(ps.match_id) = 0 THEN 0
                                ELSE ROUND((COALESCE(SUM(ps.goals), 0) * 4 + COALESCE(SUM(ps.assists), 0) * 3 + COUNT(ps.match_id)) / COUNT(ps.match_id), 2)
                            END AS formIndex,
                            CASE
                                WHEN inj.player_id IS NULL THEN 'Available'
                                ELSE 'Injured'
                            END AS availabilityStatus
                        """ + baseFromClause + """
                        GROUP BY p.player_id, p.first_name, p.last_name, p.position, p.nationality,
                                 p.preferred_foot, p.height, p.weight, p.dob, ma.url, latest_team.team_name,
                                 inj.player_id
                        ORDER BY formIndex DESC, totalGoals DESC, p.last_name ASC
                        LIMIT ? OFFSET ?
                        """,
                        safeSize, offset);

        int totalPages = totalCount == null || totalCount == 0
                ? 0
                : (int) Math.ceil((double) totalCount / safeSize);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", items);
        response.put("pageNumber", safePage);
        response.put("pageSize", safeSize);
        response.put("totalElements", totalCount == null ? 0 : totalCount);
        response.put("totalPages", totalPages);
        response.put("hasNext", totalCount != null && offset + safeSize < totalCount);
        response.put("hasPrevious", safePage > 0);
        return response;
    }

    public Map<String, Object> getPlayerDetail(long playerId) {
        Map<String, Object> detail = new LinkedHashMap<>(jdbcTemplate.queryForMap("""
                SELECT
                    p.player_id AS playerId,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.first_name AS firstName,
                    p.last_name AS lastName,
                    p.position AS position,
                    p.nationality AS nationality,
                    p.preferred_foot AS preferredFoot,
                    p.height AS height,
                    p.weight AS weight,
                    p.dob AS dateOfBirth,
                    TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) AS age,
                    ma.url AS imageUrl
                FROM player p
                LEFT JOIN media_assets ma ON ma.entity_type = 'PLAYER' AND ma.entity_id = p.player_id
                WHERE p.player_id = ?
                LIMIT 1
                """, playerId));

        detail.put("summary", jdbcTemplate.queryForMap("""
                SELECT
                    COUNT(ps.match_id) AS matchesTracked,
                    COALESCE(SUM(ps.goals), 0) AS totalGoals,
                    COALESCE(SUM(ps.assists), 0) AS totalAssists,
                    COALESCE(SUM(ps.yellow_cards), 0) AS totalYellowCards,
                    COALESCE(SUM(ps.red_cards), 0) AS totalRedCards,
                    COALESCE(SUM(ps.minutes_played), 0) AS totalMinutes,
                    COALESCE(AVG(ps.minutes_played), 0) AS avgMinutes
                FROM player p
                LEFT JOIN player_stats ps ON ps.player_id = p.player_id
                WHERE p.player_id = ?
                """, playerId));
        detail.put("careerTimeline", jdbcTemplate.queryForList("""
                SELECT
                    th.transfer_id AS transferId,
                    th.player_id AS playerId,
                    th.transfer_date AS transferDate,
                    th.transfer_fee AS transferFee,
                    th.contract_length AS contractLength,
                    ft.team_name AS fromTeam,
                    tt.team_name AS toTeam
                FROM transfer_history th
                LEFT JOIN team ft ON ft.team_id = th.from_team_id
                LEFT JOIN team tt ON tt.team_id = th.to_team_id
                WHERE th.player_id = ?
                ORDER BY th.transfer_date DESC, th.transfer_id DESC
                """, playerId));
        detail.put("injuryTimeline", jdbcTemplate.queryForList("""
                SELECT
                    i.injury_id AS injuryId,
                    i.type AS injuryType,
                    i.return_date AS returnDate
                FROM injuries i
                WHERE i.player_id = ?
                ORDER BY i.return_date ASC, i.injury_id DESC
                """, playerId));
        detail.put("matchLog", jdbcTemplate.queryForList("""
                SELECT
                    ps.match_id AS matchId,
                    m.match_date AS matchDate,
                    m.stage AS stage,
                    m.status AS status,
                    ps.goals AS goals,
                    ps.assists AS assists,
                    ps.yellow_cards AS yellowCards,
                    ps.red_cards AS redCards,
                    ps.minutes_played AS minutesPlayed
                FROM player_stats ps
                JOIN matches m ON m.match_id = ps.match_id
                WHERE ps.player_id = ?
                ORDER BY m.match_date DESC, ps.match_id DESC
                """, playerId));
        detail.put("aiScoutingReport", buildAiScoutingReport(playerId));
        return detail;
    }

    public Map<String, Object> getTeamDetail(long teamId) {
        Map<String, Object> detail = new LinkedHashMap<>(jdbcTemplate.queryForMap("""
                SELECT
                    t.team_id AS teamId,
                    t.team_name AS teamName,
                    t.home_city AS homeCity,
                    t.founded_year AS foundedYear,
                    s.stadium_name AS stadiumName,
                    s.capacity AS stadiumCapacity,
                    s.city AS stadiumCity,
                    s.country AS stadiumCountry,
                    CONCAT(m.first_name, ' ', m.last_name) AS managerName,
                    ma.url AS imageUrl
                FROM team t
                LEFT JOIN stadium s ON s.stadium_id = t.stadium_id
                LEFT JOIN manager m ON m.manager_id = t.manager_id
                LEFT JOIN media_assets ma ON ma.entity_type = 'TEAM' AND ma.entity_id = t.team_id
                WHERE t.team_id = ?
                LIMIT 1
                """, teamId));

        detail.put("standing", jdbcTemplate.queryForMap("""
                SELECT
                    COALESCE(ts.position, 0) AS leaguePosition,
                    COALESCE(ts.points, 0) AS points,
                    COALESCE(ts.wins, 0) AS wins,
                    COALESCE(ts.draws, 0) AS draws,
                    COALESCE(ts.losses, 0) AS losses,
                    COALESCE(ts.goals_for, 0) AS goalsFor,
                    COALESCE(ts.goals_against, 0) AS goalsAgainst,
                    COALESCE(ts.matches_played, 0) AS matchesPlayed
                FROM team t
                LEFT JOIN team_standings ts ON ts.team_id = t.team_id
                WHERE t.team_id = ?
                """, teamId));
        detail.put("sponsors", jdbcTemplate.queryForList("""
                SELECT
                    sp.sponsor_name AS sponsorName,
                    sp.industry AS industry,
                    sp.country AS country,
                    ts.sponsorship_value AS sponsorshipValue,
                    ts.contract_start AS contractStart,
                    ts.contract_end AS contractEnd
                FROM team_sponsor ts
                JOIN sponsor sp ON sp.sponsor_id = ts.sponsor_id
                WHERE ts.team_id = ?
                ORDER BY ts.sponsorship_value DESC, sp.sponsor_name ASC
                """, teamId));
        detail.put("financialHeader", jdbcTemplate.queryForMap("""
                SELECT
                    COALESCE(SUM(ts.sponsorship_value), 0) AS totalSponsorshipValue,
                    COALESCE(MAX(tst.position), 0) AS leaguePosition,
                    CASE
                        WHEN MAX(tst.position) IS NULL OR MAX(tst.position) = 0 THEN NULL
                        ELSE ROUND(COALESCE(SUM(ts.sponsorship_value), 0) / MAX(tst.position), 2)
                    END AS sponsorValuePerPosition
                FROM team t
                LEFT JOIN team_sponsor ts ON ts.team_id = t.team_id
                LEFT JOIN team_standings tst ON tst.team_id = t.team_id
                WHERE t.team_id = ?
                GROUP BY t.team_id
                """, teamId));
        detail.put("recentMatches", jdbcTemplate.queryForList("""
                SELECT
                    m.match_id AS matchId,
                    m.match_date AS matchDate,
                    m.stage AS stage,
                    m.status AS status,
                    tms.goals AS goals,
                    tms.possession AS possession,
                    tms.shots_on_target AS shotsOnTarget,
                    tms.fouls AS fouls
                FROM team_match_stats tms
                JOIN matches m ON m.match_id = tms.match_id
                WHERE tms.team_id = ?
                ORDER BY m.match_date DESC, m.match_id DESC
                LIMIT 8
                """, teamId));
        return detail;
    }

    public Map<String, Object> getMatchDetail(long matchId) {
        Map<String, Object> detail = new LinkedHashMap<>(buildMatchSummary(matchId));
        detail.put("eventTimeline", jdbcTemplate.queryForList("""
                SELECT
                    me.event_id AS eventId,
                    me.player_id AS playerId,
                    me.minute AS minute,
                    me.event_type AS eventType,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.position AS playerPosition
                FROM match_events me
                JOIN player p ON p.player_id = me.player_id
                WHERE me.match_id = ?
                ORDER BY me.minute ASC, me.event_id ASC
                """, matchId));
        detail.put("referee", jdbcTemplate.queryForMap("""
                SELECT
                    CONCAT(r.first_name, ' ', r.last_name) AS refereeName,
                    r.nationality AS nationality,
                    r.experience_years AS experienceYears
                FROM matches m
                JOIN referee r ON r.referee_id = m.referee_id
                WHERE m.match_id = ?
                """, matchId));
        detail.put("oracle", buildMatchOracle(detail));
        detail.put("momentumChart", buildMomentumChart(detail));
        return detail;
    }

    private Map<String, Object> buildLandingSection() {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("featuredMatch", findFeaturedMatch());
        section.put("globalMapTeams", jdbcTemplate.queryForList("""
                SELECT
                    t.team_id AS teamId,
                    t.team_name AS teamName,
                    t.home_city AS city,
                    s.country AS country,
                    s.stadium_name AS stadiumName,
                    s.capacity AS stadiumCapacity,
                    CONCAT(m.first_name, ' ', m.last_name) AS managerName,
                    recent_match.match_id AS latestMatchId,
                    recent_match.match_date AS latestMatchDate,
                    recent_match.status AS latestMatchStatus,
                    recent_match.stage AS latestMatchStage,
                    CASE
                        WHEN recent_match.status = 'Live' THEN 'Match Live'
                        WHEN recent_match.status = 'Scheduled' THEN 'Next Match Ready'
                        WHEN recent_match.match_id IS NOT NULL THEN 'Recent Match Completed'
                        ELSE 'No Match Linked'
                    END AS stadiumPulse
                FROM team t
                LEFT JOIN stadium s ON s.stadium_id = t.stadium_id
                LEFT JOIN manager m ON m.manager_id = t.manager_id
                LEFT JOIN (
                    SELECT m1.match_id, m1.stadium_id, m1.match_date, m1.status, m1.stage
                    FROM matches m1
                    JOIN (
                        SELECT stadium_id, MAX(match_date) AS latest_match_date
                        FROM matches
                        GROUP BY stadium_id
                    ) latest ON latest.stadium_id = m1.stadium_id AND latest.latest_match_date = m1.match_date
                ) recent_match ON recent_match.stadium_id = t.stadium_id
                ORDER BY t.team_name
                """));
        section.put("latestTransfers", jdbcTemplate.queryForList("""
                SELECT
                    th.transfer_id AS transferId,
                    th.player_id AS playerId,
                    th.transfer_date AS transferDate,
                    th.transfer_fee AS transferFee,
                    th.contract_length AS contractLength,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    ft.team_name AS fromTeam,
                    tt.team_name AS toTeam
                FROM transfer_history th
                LEFT JOIN player p ON p.player_id = th.player_id
                LEFT JOIN team ft ON ft.team_id = th.from_team_id
                LEFT JOIN team tt ON tt.team_id = th.to_team_id
                ORDER BY th.transfer_date DESC, th.transfer_id DESC
                LIMIT 8
                """));
        section.put("headlineStats", jdbcTemplate.queryForMap("""
                SELECT
                    (SELECT COUNT(*) FROM team) AS totalTeams,
                    (SELECT COUNT(*) FROM player) AS totalPlayers,
                    (SELECT COUNT(*) FROM stadium) AS totalStadiums,
                    (SELECT COUNT(*) FROM matches) AS totalMatches
                """));
        section.put("trendingPlayer", jdbcTemplate.queryForMap("""
                SELECT
                    p.player_id AS playerId,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.position AS position,
                    p.nationality AS nationality,
                    ma.url AS imageUrl,
                    COUNT(ps.match_id) AS matchesTracked,
                    COALESCE(SUM(ps.goals), 0) AS totalGoals,
                    COALESCE(SUM(ps.assists), 0) AS totalAssists,
                    COALESCE(SUM(ps.minutes_played), 0) AS totalMinutes,
                    ROUND((COALESCE(SUM(ps.goals), 0) * 4 + COALESCE(SUM(ps.assists), 0) * 3 + COUNT(ps.match_id)) / NULLIF(COUNT(ps.match_id), 0), 2) AS pulseScore
                FROM player p
                LEFT JOIN player_stats ps ON ps.player_id = p.player_id
                LEFT JOIN media_assets ma ON ma.entity_type = 'PLAYER' AND ma.entity_id = p.player_id
                GROUP BY p.player_id, p.first_name, p.last_name, p.position, p.nationality, ma.url
                ORDER BY pulseScore DESC, totalGoals DESC, totalAssists DESC, totalMinutes DESC
                LIMIT 1
                """));
        section.put("spotlightScouts", jdbcTemplate.queryForList("""
                SELECT
                    p.player_id AS playerId,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.position AS position,
                    p.nationality AS nationality,
                    p.height AS height,
                    p.preferred_foot AS preferredFoot
                FROM player p
                WHERE p.position IN ('Defender', 'Forward')
                ORDER BY p.height DESC, p.last_name ASC
                LIMIT 6
                """));
        return section;
    }

    private Map<String, Object> buildMatchCenterSection() {
        Map<String, Object> section = new LinkedHashMap<>();
        Map<String, Object> featuredMatch = findFeaturedMatch();
        Number matchId = featuredMatch == null ? null : (Number) featuredMatch.get("matchId");

        section.put("featuredMatch", featuredMatch);
        section.put("fixtureStrip", jdbcTemplate.queryForList("""
                SELECT
                    m.match_id AS matchId,
                    m.match_date AS matchDate,
                    m.stage AS stage,
                    m.status AS status,
                    COALESCE(COUNT(DISTINCT tms.team_id), 0) AS teamsTracked,
                    COALESCE(COUNT(DISTINCT me.event_id), 0) AS eventCount
                FROM matches m
                LEFT JOIN team_match_stats tms ON tms.match_id = m.match_id
                LEFT JOIN match_events me ON me.match_id = m.match_id
                GROUP BY m.match_id, m.match_date, m.stage, m.status
                ORDER BY m.match_date DESC
                LIMIT 6
                """));
        section.put("eventTimeline", matchId == null ? List.of() : jdbcTemplate.queryForList("""
                SELECT
                    me.event_id AS eventId,
                    me.player_id AS playerId,
                    me.minute AS minute,
                    me.event_type AS eventType,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.position AS playerPosition
                FROM match_events me
                JOIN player p ON p.player_id = me.player_id
                WHERE me.match_id = ?
                ORDER BY me.minute ASC, me.event_id ASC
                """, matchId.longValue()));
        section.put("refWatch", matchId == null ? defaultRefWatch() : jdbcTemplate.queryForMap("""
                SELECT
                    CONCAT(r.first_name, ' ', r.last_name) AS refereeName,
                    r.nationality AS nationality,
                    r.experience_years AS experienceYears,
                    COUNT(DISTINCT m2.match_id) AS matchesOfficiated,
                    COALESCE(AVG(card_totals.totalYellowCards), 0) AS avgYellowCards,
                    COALESCE(AVG(card_totals.totalRedCards), 0) AS avgRedCards,
                    COALESCE(AVG(card_totals.totalFouls), 0) AS avgFouls,
                    COALESCE(ROUND((AVG(card_totals.totalYellowCards) * 1.0) + (AVG(card_totals.totalRedCards) * 2.5), 2), 0) AS strictnessIndex
                FROM matches m
                JOIN referee r ON r.referee_id = m.referee_id
                JOIN matches m2 ON m2.referee_id = r.referee_id
                LEFT JOIN (
                    SELECT
                        tms.match_id,
                        SUM(COALESCE(tms.yellow_cards, 0)) AS totalYellowCards,
                        SUM(COALESCE(tms.red_cards, 0)) AS totalRedCards,
                        SUM(COALESCE(tms.fouls, 0)) AS totalFouls
                    FROM team_match_stats tms
                    GROUP BY tms.match_id
                ) card_totals ON card_totals.match_id = m2.match_id
                WHERE m.match_id = ?
                GROUP BY r.referee_id, r.first_name, r.last_name, r.nationality, r.experience_years
                """, matchId.longValue()));
        section.put("teamComparison", matchId == null ? List.of() : jdbcTemplate.queryForList("""
                SELECT
                    t.team_id AS teamId,
                    t.team_name AS teamName,
                    tms.possession AS possession,
                    tms.shots_on_target AS shotsOnTarget,
                    tms.fouls AS fouls,
                    tms.total_shots AS totalShots,
                    tms.corners AS corners,
                    tms.goals AS goals
                FROM team_match_stats tms
                JOIN team t ON t.team_id = tms.team_id
                WHERE tms.match_id = ?
                ORDER BY tms.goals DESC, t.team_name ASC
                """, matchId.longValue()));
        section.put("oracle", matchId == null ? defaultOracleState() : buildMatchOracle(featuredMatch));
        section.put("homeFortress", jdbcTemplate.queryForList("""
                SELECT
                    t.team_id AS teamId,
                    t.team_name AS teamName,
                    s.stadium_name AS stadiumName,
                    COUNT(m.match_id) AS homeMatchesTracked,
                    COALESCE(AVG(tms.possession), 0) AS avgPossession,
                    COALESCE(AVG(tms.goals), 0) AS avgGoals
                FROM team t
                JOIN stadium s ON s.stadium_id = t.stadium_id
                LEFT JOIN matches m ON m.stadium_id = t.stadium_id
                LEFT JOIN team_match_stats tms ON tms.match_id = m.match_id AND tms.team_id = t.team_id
                GROUP BY t.team_id, t.team_name, s.stadium_name
                ORDER BY avgGoals DESC, avgPossession DESC, homeMatchesTracked DESC
                LIMIT 5
                """));
        section.put("matchLeaders", matchId == null ? List.of() : jdbcTemplate.queryForList("""
                SELECT
                    p.player_id AS playerId,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.position AS position,
                    SUM(CASE WHEN me.event_type = 'GOAL' THEN 1 ELSE 0 END) AS goals,
                    SUM(CASE WHEN me.event_type = 'ASSIST' THEN 1 ELSE 0 END) AS assists,
                    SUM(CASE WHEN me.event_type = 'YELLOW_CARD' THEN 1 ELSE 0 END) AS yellowCards,
                    SUM(CASE WHEN me.event_type = 'RED_CARD' THEN 1 ELSE 0 END) AS redCards
                FROM match_events me
                JOIN player p ON p.player_id = me.player_id
                WHERE me.match_id = ?
                GROUP BY p.player_id, p.first_name, p.last_name, p.position
                ORDER BY goals DESC, assists DESC, redCards ASC, yellowCards ASC, p.last_name ASC
                LIMIT 6
                """, matchId.longValue()));
        section.put("statusMessage", matchId == null
                ? "No live or scheduled match is available yet, so Match Center is showing readiness widgets."
                : "Match Center is using the current featured fixture.");
        return section;
    }

    private Map<String, Object> buildPortalsSection() {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("playerCards", jdbcTemplate.queryForList("""
                SELECT
                    p.player_id AS playerId,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.position AS position,
                    p.nationality AS nationality,
                    p.preferred_foot AS preferredFoot,
                    p.height AS height,
                    p.weight AS weight,
                    TIMESTAMPDIFF(YEAR, p.dob, CURDATE()) AS age,
                    ma.url AS imageUrl,
                    latest_team.team_name AS currentTeam,
                    COUNT(ps.match_id) AS matchesTracked,
                    COALESCE(SUM(ps.goals), 0) AS totalGoals,
                    COALESCE(SUM(ps.assists), 0) AS totalAssists,
                    COALESCE(SUM(ps.minutes_played), 0) AS totalMinutes,
                    COALESCE(AVG(ps.minutes_played), 0) AS avgMinutes,
                    COALESCE(SUM(ps.yellow_cards), 0) AS totalYellowCards,
                    COALESCE(SUM(ps.red_cards), 0) AS totalRedCards,
                    CASE
                        WHEN COUNT(ps.match_id) = 0 THEN 0
                        ELSE ROUND((COALESCE(SUM(ps.goals), 0) * 4 + COALESCE(SUM(ps.assists), 0) * 3 + COUNT(ps.match_id)) / COUNT(ps.match_id), 2)
                    END AS formIndex,
                    CASE
                        WHEN inj.player_id IS NULL THEN 'Available'
                        ELSE 'Injured'
                    END AS availabilityStatus
                FROM player p
                LEFT JOIN media_assets ma ON ma.entity_type = 'PLAYER' AND ma.entity_id = p.player_id
                LEFT JOIN player_stats ps ON ps.player_id = p.player_id
                LEFT JOIN (
                    SELECT th1.player_id, th1.to_team_id
                    FROM transfer_history th1
                    JOIN (
                        SELECT player_id, MAX(transfer_date) AS latest_transfer
                        FROM transfer_history
                        GROUP BY player_id
                    ) latest ON latest.player_id = th1.player_id AND latest.latest_transfer = th1.transfer_date
                ) latest_transfer ON latest_transfer.player_id = p.player_id
                LEFT JOIN team latest_team ON latest_team.team_id = latest_transfer.to_team_id
                LEFT JOIN (
                    SELECT DISTINCT player_id
                    FROM injuries
                    WHERE return_date IS NULL OR return_date >= CURDATE()
                ) inj ON inj.player_id = p.player_id
                GROUP BY p.player_id, p.first_name, p.last_name, p.position, p.nationality,
                         p.preferred_foot, p.height, p.weight, p.dob, ma.url, latest_team.team_name,
                         inj.player_id
                ORDER BY formIndex DESC, totalGoals DESC, p.last_name ASC
                LIMIT 12
                """));
        section.put("teamCards", jdbcTemplate.queryForList("""
                SELECT
                    t.team_id AS teamId,
                    t.team_name AS teamName,
                    t.home_city AS homeCity,
                    t.founded_year AS foundedYear,
                    s.stadium_name AS stadiumName,
                    s.capacity AS stadiumCapacity,
                    CONCAT(m.first_name, ' ', m.last_name) AS managerName,
                    ma.url AS imageUrl,
                    ts.position AS leaguePosition,
                    ts.points AS points,
                    ts.wins AS wins,
                    ts.draws AS draws,
                    ts.losses AS losses,
                    ts.goals_for AS goalsFor,
                    ts.goals_against AS goalsAgainst
                FROM team t
                LEFT JOIN stadium s ON s.stadium_id = t.stadium_id
                LEFT JOIN manager m ON m.manager_id = t.manager_id
                LEFT JOIN media_assets ma ON ma.entity_type = 'TEAM' AND ma.entity_id = t.team_id
                LEFT JOIN team_standings ts ON ts.team_id = t.team_id
                ORDER BY t.team_name
                """));
        section.put("injuryReport", jdbcTemplate.queryForList("""
                SELECT
                    i.injury_id AS injuryId,
                    i.player_id AS playerId,
                    i.type AS injuryType,
                    i.return_date AS returnDate,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    p.position AS position
                FROM injuries i
                JOIN player p ON p.player_id = i.player_id
                ORDER BY i.return_date ASC, i.injury_id DESC
                LIMIT 10
                """));
        section.put("boardroom", jdbcTemplate.queryForList("""
                SELECT
                    t.team_id AS teamId,
                    t.team_name AS teamName,
                    COALESCE(SUM(ts.sponsorship_value), 0) AS sponsorshipRevenue,
                    COALESCE(MAX(s2.prize_money), 0) AS topPrizePool,
                    COALESCE(MAX(tsd.position), 0) AS leaguePosition,
                    COALESCE(MAX(tsd.points), 0) AS leaguePoints,
                    COALESCE(SUM(ts.sponsorship_value), 0) + COALESCE(MAX(s2.prize_money), 0) AS estimatedSeasonRevenue
                FROM team t
                LEFT JOIN team_sponsor ts ON ts.team_id = t.team_id
                LEFT JOIN tournament s2 ON 1 = 1
                LEFT JOIN team_standings tsd ON tsd.team_id = t.team_id
                GROUP BY t.team_id, t.team_name
                ORDER BY estimatedSeasonRevenue DESC, t.team_name ASC
                """));
        section.put("sponsorRoi", jdbcTemplate.queryForList("""
                SELECT
                    t.team_name AS teamName,
                    sp.sponsor_name AS sponsorName,
                    ts.sponsorship_value AS sponsorshipValue,
                    tsd.position AS leaguePosition,
                    CASE
                        WHEN tsd.position IS NULL OR tsd.position = 0 THEN NULL
                        ELSE ROUND(ts.sponsorship_value / tsd.position, 2)
                    END AS roiScore
                FROM team_sponsor ts
                JOIN sponsor sp ON sp.sponsor_id = ts.sponsor_id
                JOIN team t ON t.team_id = ts.team_id
                LEFT JOIN team_standings tsd ON tsd.team_id = t.team_id
                ORDER BY roiScore DESC
                LIMIT 8
                """));
        section.put("scoutingDesk", Map.of(
                "tallestDefenders", jdbcTemplate.queryForList("""
                        SELECT
                            p.player_id AS playerId,
                            CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                            p.height AS height,
                            p.nationality AS nationality
                        FROM player p
                        WHERE p.position = 'Defender'
                        ORDER BY p.height DESC, p.last_name ASC
                        LIMIT 5
                        """),
                "targetForwards", jdbcTemplate.queryForList("""
                        SELECT
                            p.player_id AS playerId,
                            CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                            p.height AS height,
                            p.preferred_foot AS preferredFoot
                        FROM player p
                        WHERE p.position = 'Forward'
                        ORDER BY p.height DESC, p.last_name ASC
                        LIMIT 5
                        """)
        ));
        section.put("portalHighlights", jdbcTemplate.queryForMap("""
                SELECT
                    (SELECT COUNT(*) FROM injuries WHERE return_date IS NULL OR return_date >= CURDATE()) AS activeInjuries,
                    (SELECT COUNT(*) FROM transfer_history) AS totalTransfers,
                    (SELECT COUNT(*) FROM team_standings) AS trackedTeams,
                    (SELECT COUNT(*) FROM player_stats) AS trackedPlayerStatRows
                """));
        return section;
    }

    private Map<String, Object> buildFanCaveSection() {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("userBase", jdbcTemplate.queryForMap("""
                SELECT
                    COUNT(*) AS totalUsers,
                    COUNT(fav_team_id) AS usersFollowingTeams
                FROM users
                """));
        section.put("followedTeams", jdbcTemplate.queryForList("""
                SELECT
                    u.user_id AS userId,
                    u.username AS username,
                    u.email AS email,
                    t.team_name AS favouriteTeam,
                    ts.position AS leaguePosition,
                    ts.points AS points
                FROM users u
                LEFT JOIN team t ON t.team_id = u.fav_team_id
                LEFT JOIN team_standings ts ON ts.team_id = t.team_id
                ORDER BY u.created_at DESC
                LIMIT 8
                """));
        section.put("teamPopularity", jdbcTemplate.queryForList("""
                SELECT
                    t.team_id AS teamId,
                    t.team_name AS teamName,
                    COUNT(u.user_id) AS followerCount,
                    MAX(ts.position) AS leaguePosition
                FROM team t
                LEFT JOIN users u ON u.fav_team_id = t.team_id
                LEFT JOIN team_standings ts ON ts.team_id = t.team_id
                GROUP BY t.team_id, t.team_name
                ORDER BY followerCount DESC, leaguePosition ASC, t.team_name ASC
                LIMIT 7
                """));
        section.put("alerts", jdbcTemplate.queryForList("""
                SELECT
                    'TRANSFER' AS alertType,
                    CONCAT(p.first_name, ' ', p.last_name) AS subjectName,
                    th.transfer_date AS alertDate,
                    CONCAT(COALESCE(ft.team_name, 'Unknown'), ' -> ', COALESCE(tt.team_name, 'Unknown')) AS detail,
                    GROUP_CONCAT(DISTINCT u.username ORDER BY u.username SEPARATOR ', ') AS interestedUsers
                FROM transfer_history th
                JOIN player p ON p.player_id = th.player_id
                LEFT JOIN team ft ON ft.team_id = th.from_team_id
                LEFT JOIN team tt ON tt.team_id = th.to_team_id
                LEFT JOIN users u ON u.fav_team_id IN (th.from_team_id, th.to_team_id)
                GROUP BY th.transfer_id, p.first_name, p.last_name, th.transfer_date, ft.team_name, tt.team_name
                UNION ALL
                SELECT
                    'INJURY' AS alertType,
                    CONCAT(p.first_name, ' ', p.last_name) AS subjectName,
                    i.return_date AS alertDate,
                    i.type AS detail,
                    GROUP_CONCAT(DISTINCT u.username ORDER BY u.username SEPARATOR ', ') AS interestedUsers
                FROM injuries i
                JOIN player p ON p.player_id = i.player_id
                LEFT JOIN (
                    SELECT th1.player_id, th1.to_team_id
                    FROM transfer_history th1
                    JOIN (
                        SELECT player_id, MAX(transfer_date) AS latest_transfer
                        FROM transfer_history
                        GROUP BY player_id
                    ) latest ON latest.player_id = th1.player_id AND latest.latest_transfer = th1.transfer_date
                ) latest_transfer ON latest_transfer.player_id = i.player_id
                LEFT JOIN users u ON u.fav_team_id = latest_transfer.to_team_id
                GROUP BY i.injury_id, p.first_name, p.last_name, i.return_date, i.type
                ORDER BY alertDate DESC
                LIMIT 12
                """));
        section.put("watchlistSuggestions", Map.of(
                "teams", jdbcTemplate.queryForList("""
                        SELECT
                            t.team_id AS teamId,
                            t.team_name AS teamName,
                            t.home_city AS homeCity,
                            ts.position AS leaguePosition,
                            ts.points AS points
                        FROM team t
                        LEFT JOIN team_standings ts ON ts.team_id = t.team_id
                        ORDER BY ts.position ASC, t.team_name ASC
                        LIMIT 5
                        """),
                "players", jdbcTemplate.queryForList("""
                        SELECT
                            p.player_id AS playerId,
                            CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                            p.position AS position,
                            p.nationality AS nationality,
                            COALESCE(SUM(ps.goals), 0) AS totalGoals,
                            COALESCE(SUM(ps.assists), 0) AS totalAssists
                        FROM player p
                        LEFT JOIN player_stats ps ON ps.player_id = p.player_id
                        GROUP BY p.player_id, p.first_name, p.last_name, p.position, p.nationality
                        ORDER BY totalGoals DESC, totalAssists DESC, p.last_name ASC
                        LIMIT 5
                        """)
        ));
        section.put("fanPulse", jdbcTemplate.queryForMap("""
                SELECT
                    (SELECT COUNT(*) FROM users WHERE fav_team_id IS NOT NULL) AS activeFollows,
                    (SELECT COUNT(*) FROM transfer_history) AS transferAlertsReady,
                    (SELECT COUNT(*) FROM injuries) AS injuryAlertsReady,
                    (SELECT COUNT(DISTINCT fav_team_id) FROM users WHERE fav_team_id IS NOT NULL) AS uniqueTeamsFollowed
                """));
        section.put("statusMessage", jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Integer.class) == 0
                ? "No user follows are stored yet. Fan Cave is ready for onboarding once user activity starts."
                : "Fan Cave is now using live follows, standings context, transfer alerts, and injury alerts.");
        return section;
    }

    private Map<String, Object> findFeaturedMatch() {
        List<Map<String, Object>> matches = jdbcTemplate.queryForList("""
                SELECT
                    m.match_id AS matchId
                FROM matches m
                LEFT JOIN team_match_stats tms ON tms.match_id = m.match_id
                LEFT JOIN match_events me ON me.match_id = m.match_id
                GROUP BY m.match_id, m.match_date, m.status
                ORDER BY
                    CASE
                        WHEN m.status = 'Live' THEN 0
                        WHEN m.status = 'Scheduled' THEN 1
                        ELSE 2
                    END,
                    CASE WHEN COUNT(DISTINCT tms.team_id) >= 2 THEN 0 ELSE 1 END,
                    COUNT(DISTINCT me.event_id) DESC,
                    m.match_date DESC
                LIMIT 1
                """);

        if (matches.isEmpty()) {
            return null;
        }

        Number matchId = (Number) matches.get(0).get("matchId");
        return buildMatchSummary(matchId.longValue());
    }

    private Map<String, Object> buildMatchSummary(long matchId) {
        Map<String, Object> summary = new LinkedHashMap<>(jdbcTemplate.queryForMap("""
                SELECT
                    m.match_id AS matchId,
                    m.match_date AS matchDate,
                    m.stage AS stage,
                    m.status AS status,
                    s.stadium_name AS stadiumName,
                    s.city AS city,
                    s.country AS country,
                    s.capacity AS capacity,
                    CONCAT(r.first_name, ' ', r.last_name) AS refereeName,
                    r.nationality AS refereeNationality,
                    sea.season_year AS seasonName
                FROM matches m
                LEFT JOIN stadium s ON s.stadium_id = m.stadium_id
                LEFT JOIN referee r ON r.referee_id = m.referee_id
                LEFT JOIN season sea ON sea.season_id = m.season_id
                WHERE m.match_id = ?
                """, matchId));

        List<Map<String, Object>> teams = jdbcTemplate.queryForList("""
                SELECT
                    t.team_id AS teamId,
                    t.team_name AS teamName,
                    t.home_city AS homeCity,
                    tms.goals AS goals,
                    tms.possession AS possession,
                    tms.shots_on_target AS shotsOnTarget,
                    tms.total_shots AS totalShots,
                    tms.fouls AS fouls,
                    tms.corners AS corners,
                    tms.yellow_cards AS yellowCards,
                    tms.red_cards AS redCards,
                    ma.url AS imageUrl
                FROM team_match_stats tms
                JOIN team t ON t.team_id = tms.team_id
                LEFT JOIN media_assets ma ON ma.entity_type = 'TEAM' AND ma.entity_id = t.team_id
                WHERE tms.match_id = ?
                ORDER BY tms.goals DESC, t.team_name ASC
                """, matchId);

        summary.put("teams", teams);
        summary.put("scoreline", teams.stream()
                .map(team -> String.valueOf(team.get("goals")))
                .reduce((left, right) -> left + " - " + right)
                .orElse("No score"));
        summary.put("matchLabel", teams.stream()
                .map(team -> String.valueOf(team.get("teamName")))
                .reduce((left, right) -> left + " vs " + right)
                .orElse("Fixture pending"));
        summary.put("eventCount", jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM match_events WHERE match_id = ?",
                Integer.class,
                matchId
        ));
        return summary;
    }

    private Map<String, Object> defaultRefWatch() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("refereeName", null);
        payload.put("nationality", null);
        payload.put("experienceYears", 0);
        payload.put("matchesOfficiated", 0);
        payload.put("avgYellowCards", 0);
        payload.put("avgRedCards", 0);
        payload.put("avgFouls", 0);
        payload.put("strictnessIndex", 0);
        return payload;
    }

    private Map<String, Object> defaultOracleState() {
        return Map.of(
                "status", "unavailable",
                "message", "Oracle prediction is not available for this fixture yet."
        );
    }

    private Map<String, Object> buildMatchOracle(Map<String, Object> matchSummary) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> teams = (List<Map<String, Object>>) matchSummary.get("teams");

        if (teams == null || teams.size() < 2) {
            return defaultOracleState();
        }

        Number homeTeamId = (Number) teams.get(0).get("teamId");
        Number awayTeamId = (Number) teams.get(1).get("teamId");

        if (homeTeamId == null || awayTeamId == null) {
            return defaultOracleState();
        }

        Number currentMatchId = (Number) matchSummary.get("matchId");
        long matchId = currentMatchId == null ? -1L : currentMatchId.longValue();

        Map<String, Double> recentForm = buildRecentTeamForm(matchId, homeTeamId.longValue(), awayTeamId.longValue());
        if (recentForm.isEmpty()) {
            return Map.of(
                    "status", "insufficient_data",
                    "message", "Oracle prediction needs recent team scoring and conceding data."
            );
        }

        try {
            AiOracleResult oracle = aiWebClient.post()
                    .uri("/ai/win-probability")
                    .bodyValue(new AiOracleRequest(
                            recentForm.getOrDefault("home_scored_avg", 0.0),
                            recentForm.getOrDefault("home_conceded_avg", 0.0),
                            recentForm.getOrDefault("away_scored_avg", 0.0),
                            recentForm.getOrDefault("away_conceded_avg", 0.0)
                    ))
                    .retrieve()
                    .bodyToMono(AiOracleResult.class)
                    .timeout(Duration.ofSeconds(2))
                    .block();

            if (oracle == null) {
                return defaultOracleState();
            }

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("status", "ready");
            payload.put("projectedScore", oracle.projected_score());
            payload.put("homeWin", oracle.home_win());
            payload.put("draw", oracle.draw());
            payload.put("awayWin", oracle.away_win());
            payload.put("homeLambda", oracle.home_lambda());
            payload.put("awayLambda", oracle.away_lambda());
            payload.put("confidenceBand", oracle.confidence_band());
            payload.put("narrative", oracle.narrative());
            payload.put("totalExpectedGoals", oracle.total_expected_goals());
            payload.put("goalAlert", oracle.total_expected_goals() > 3.5 ? "Goal Alert: projected high-event fixture." : null);
            payload.put("message", "Oracle combines recent attack and defense form into a Poisson forecast.");
            return payload;
        } catch (Exception ignored) {
            return Map.of(
                    "status", "service_offline",
                    "message", "Oracle is ready, but the Python sidecar is not responding on localhost:8001."
            );
        }
    }

    private Map<String, Double> buildRecentTeamForm(long currentMatchId, long homeTeamId, long awayTeamId) {
        List<Map<String, Object>> homeRecent = jdbcTemplate.queryForList("""
                SELECT
                    tms.goals AS goalsFor,
                    COALESCE(opp.goals, 0) AS goalsAgainst
                FROM team_match_stats tms
                LEFT JOIN team_match_stats opp ON opp.match_id = tms.match_id AND opp.team_id <> tms.team_id
                JOIN matches m ON m.match_id = tms.match_id
                WHERE tms.team_id = ?
                  AND tms.match_id <> ?
                  AND m.status <> 'Scheduled'
                ORDER BY m.match_date DESC, m.match_id DESC
                LIMIT 5
                """, homeTeamId, currentMatchId);

        List<Map<String, Object>> awayRecent = jdbcTemplate.queryForList("""
                SELECT
                    tms.goals AS goalsFor,
                    COALESCE(opp.goals, 0) AS goalsAgainst
                FROM team_match_stats tms
                LEFT JOIN team_match_stats opp ON opp.match_id = tms.match_id AND opp.team_id <> tms.team_id
                JOIN matches m ON m.match_id = tms.match_id
                WHERE tms.team_id = ?
                  AND tms.match_id <> ?
                  AND m.status <> 'Scheduled'
                ORDER BY m.match_date DESC, m.match_id DESC
                LIMIT 5
                """, awayTeamId, currentMatchId);

        if (homeRecent.isEmpty() || awayRecent.isEmpty()) {
            return Map.of();
        }

        return Map.of(
                "home_scored_avg", averageMetric(homeRecent, "goalsFor"),
                "home_conceded_avg", averageMetric(homeRecent, "goalsAgainst"),
                "away_scored_avg", averageMetric(awayRecent, "goalsFor"),
                "away_conceded_avg", averageMetric(awayRecent, "goalsAgainst")
        );
    }

    private double averageMetric(List<Map<String, Object>> rows, String key) {
        if (rows.isEmpty()) {
            return 0;
        }

        double total = 0;
        for (Map<String, Object> row : rows) {
            total += toDouble(row.get(key));
        }
        return roundTwoDecimals(total / rows.size());
    }

    private Map<String, Object> buildAiScoutingReport(long playerId) {
        List<AiSimilarityPoolRow> pool = buildSimilarityPool();
        if (pool.size() < 2) {
            return Map.of(
                    "status", "insufficient_data",
                    "message", "Not enough player-stat rows are available to calculate statistical twins yet.",
                    "twins", List.of()
            );
        }

        boolean playerPresent = pool.stream().anyMatch(row -> row.player_id() == playerId);
        if (!playerPresent) {
            return Map.of(
                    "status", "player_missing",
                    "message", "This player does not have enough tracked performance data for AI similarity yet.",
                    "twins", List.of()
            );
        }

        try {
            List<AiTwinResult> aiResponse = aiWebClient.post()
                    .uri("/ai/player-similarity")
                    .bodyValue(new AiSimilarityRequest(playerId, pool))
                    .retrieve()
                    .bodyToFlux(AiTwinResult.class)
                    .collectList()
                    .timeout(Duration.ofSeconds(2))
                    .onErrorResume(WebClientResponseException.NotFound.class, ignored -> Mono.just(List.of()))
                    .block();

            List<Map<String, Object>> enrichedTwins = new ArrayList<>();
            for (AiTwinResult twin : aiResponse == null ? List.<AiTwinResult>of() : aiResponse) {
                List<Map<String, Object>> matchingPlayers = jdbcTemplate.queryForList("""
                        SELECT
                            p.player_id AS playerId,
                            CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                            p.position AS position,
                            p.nationality AS nationality,
                            ma.url AS imageUrl
                        FROM player p
                        LEFT JOIN media_assets ma ON ma.entity_type = 'PLAYER' AND ma.entity_id = p.player_id
                        WHERE p.player_id = ?
                        LIMIT 1
                        """, twin.player_id());

                if (matchingPlayers.isEmpty()) {
                    continue;
                }

                Map<String, Object> twinPayload = new LinkedHashMap<>(matchingPlayers.get(0));
                twinPayload.put("score", twin.score());
                twinPayload.put("explanations", twin.explanations() == null ? List.of() : twin.explanations());
                enrichedTwins.add(twinPayload);
            }

            return Map.of(
                    "status", enrichedTwins.isEmpty() ? "unavailable" : "ready",
                    "message", enrichedTwins.isEmpty()
                            ? "AI service returned no matching twins for this player."
                            : "AI similarity is calculated from normalized match performance, not physical profile.",
                    "twins", enrichedTwins
            );
        } catch (Exception ignored) {
            return Map.of(
                    "status", "service_offline",
                    "message", "AI scouting is ready, but the Python sidecar is not running on localhost:8001 yet.",
                    "twins", List.of()
            );
        }
    }

    private List<AiSimilarityPoolRow> buildSimilarityPool() {
        return jdbcTemplate.query("""
                SELECT
                    p.player_id AS playerId,
                    CONCAT(p.first_name, ' ', p.last_name) AS playerName,
                    COALESCE(SUM(ps.goals), 0) AS goals,
                    COALESCE(SUM(ps.assists), 0) AS assists,
                    COALESCE(SUM(ps.minutes_played), 0) AS minutes,
                    COALESCE(SUM(ps.yellow_cards), 0) AS yellowCards,
                    COALESCE(SUM(ps.red_cards), 0) AS redCards
                FROM player p
                JOIN player_stats ps ON ps.player_id = p.player_id
                GROUP BY p.player_id, p.first_name, p.last_name
                HAVING COUNT(ps.match_id) > 0
                ORDER BY p.player_id
                """, (rs, rowNum) -> new AiSimilarityPoolRow(
                rs.getLong("playerId"),
                rs.getString("playerName"),
                rs.getDouble("goals"),
                rs.getDouble("assists"),
                rs.getDouble("minutes"),
                rs.getDouble("yellowCards"),
                rs.getDouble("redCards")
        ));
    }

    private List<Map<String, Object>> buildMomentumChart(Map<String, Object> matchDetail) {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> teams = (List<Map<String, Object>>) matchDetail.get("teams");

        if (teams == null || teams.size() < 2) {
            return List.of();
        }

        Map<String, Object> firstTeam = teams.get(0);
        Map<String, Object> secondTeam = teams.get(1);

        double firstBase = toDouble(firstTeam.get("possession")) + toDouble(firstTeam.get("shotsOnTarget")) * 4 + toDouble(firstTeam.get("corners")) * 2;
        double secondBase = toDouble(secondTeam.get("possession")) + toDouble(secondTeam.get("shotsOnTarget")) * 4 + toDouble(secondTeam.get("corners")) * 2;
        double firstGoals = toDouble(firstTeam.get("goals"));
        double secondGoals = toDouble(secondTeam.get("goals"));

        Map<String, Object> firstHalf = new LinkedHashMap<>();
        firstHalf.put("period", "First Half");
        firstHalf.put("firstTeamMomentum", roundTwoDecimals(firstBase * 0.48 + firstGoals * 2));
        firstHalf.put("secondTeamMomentum", roundTwoDecimals(secondBase * 0.42 + secondGoals * 1.5));

        Map<String, Object> secondHalf = new LinkedHashMap<>();
        secondHalf.put("period", "Second Half");
        secondHalf.put("firstTeamMomentum", roundTwoDecimals(firstBase * 0.52 + firstGoals * 3));
        secondHalf.put("secondTeamMomentum", roundTwoDecimals(secondBase * 0.58 + secondGoals * 3));

        return List.of(firstHalf, secondHalf);
    }

    private double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }

        if (value == null) {
            return 0;
        }

        return Double.parseDouble(String.valueOf(value));
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
