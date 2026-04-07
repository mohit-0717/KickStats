import React from 'react';
import { Link } from 'react-router-dom';
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import AiPulseBadge from '../components/AiPulseBadge';
import EmptyState from '../components/common/EmptyState';
import Icon from '../components/common/Icon';
import MatchOracle from '../components/MatchOracle';
import { Icons } from '../constants/icons';
import { usePulseData } from '../hooks/usePulseData';

const metricValue = (team, metric) => {
    if (metric === 'Possession') {
        return Number(team.possession ?? 0);
    }

    if (metric === 'Shots On Target') {
        return Number(team.shotsOnTarget ?? 0);
    }

    return Number(team.fouls ?? 0);
};

const formatDateTime = (value) => {
    if (!value) {
        return 'TBD';
    }

    return new Date(value).toLocaleString();
};

const getStatusTone = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('live')) {
        return 'live';
    }
    if (normalized.includes('complete') || normalized.includes('finished')) {
        return 'complete';
    }
    return 'scheduled';
};

const getTimelineIcon = (eventType) => {
    const normalized = String(eventType || '').toLowerCase();
    if (normalized.includes('goal')) {
        return Icons.goals;
    }
    if (normalized.includes('assist')) {
        return Icons.assists;
    }
    if (normalized.includes('yellow') || normalized.includes('red') || normalized.includes('card')) {
        return Icons.ai;
    }
    return Icons.referee;
};

const getTimelineTone = (eventType) => {
    const normalized = String(eventType || '').toLowerCase();
    if (normalized.includes('goal')) {
        return 'goal';
    }
    if (normalized.includes('assist')) {
        return 'assist';
    }
    if (normalized.includes('yellow') || normalized.includes('red') || normalized.includes('card')) {
        return 'card';
    }
    return 'neutral';
};

const breakdownMetrics = [
    { key: 'shotsOnTarget', label: 'Shots', icon: Icons.goals },
    { key: 'fouls', label: 'Fouls', icon: Icons.ai },
    { key: 'yellowCards', label: 'Cards', icon: Icons.stats }
];

const formatMetricLabel = (key) => {
    if (key === 'shotsOnTarget') {
        return 'Shots';
    }
    if (key === 'yellowCards') {
        return 'Cards';
    }
    return 'Fouls';
};

const getRankLabel = (index) => {
    if (index === 0) {
        return 'Top';
    }
    if (index === 1) {
        return '2';
    }
    if (index === 2) {
        return '3';
    }
    return `${index + 1}`;
};

const getMomentumPhases = (timeline, homeTeamName, awayTeamName) => {
    const phases = [
        { label: '0–30', minuteStart: 0, minuteEnd: 30 },
        { label: '30–60', minuteStart: 31, minuteEnd: 60 },
        { label: '60–90', minuteStart: 61, minuteEnd: 120 }
    ];

    return phases.map((phase) => {
        const events = timeline.filter((event) => {
            const minute = Number(event.minute ?? 0);
            return minute >= phase.minuteStart && minute <= phase.minuteEnd;
        });

        let homeScore = 0;
        let awayScore = 0;

        events.forEach((event, index) => {
            const tone = getTimelineTone(event.eventType);
            const weight = tone === 'goal' ? 3 : tone === 'assist' ? 2 : tone === 'card' ? 1 : 1;
            if (index % 2 === 0) {
                homeScore += weight;
            } else {
                awayScore += weight;
            }
        });

        let winner = 'Equal';
        if (homeScore > awayScore) {
            winner = homeTeamName || 'Home';
        } else if (awayScore > homeScore) {
            winner = awayTeamName || 'Away';
        }

        const total = Math.max(homeScore + awayScore, 1);
        return {
            ...phase,
            winner,
            homeShare: `${(homeScore / total) * 100}%`,
            awayShare: `${(awayScore / total) * 100}%`
        };
    });
};

const MatchCenter = () => {
    const { data, loading, error } = usePulseData();
    const matchCenter = data?.matchCenter;
    const featuredMatch = matchCenter?.featuredMatch;
    const refWatch = matchCenter?.refWatch ?? {};
    const comparison = matchCenter?.teamComparison ?? [];
    const timeline = matchCenter?.eventTimeline ?? [];
    const fortress = matchCenter?.homeFortress ?? [];
    const fixtureStrip = matchCenter?.fixtureStrip ?? [];
    const matchLeaders = matchCenter?.matchLeaders ?? [];
    const featuredTeams = featuredMatch?.teams ?? [];
    const oracle = matchCenter?.oracle ?? {};
    const statusTone = getStatusTone(featuredMatch?.status);
    const timelinePreview = timeline.slice(-3).reverse();
    const rankedMatchLeaders = [...matchLeaders].sort((left, right) => {
        const leftImpact = Number(left.goals ?? 0) * 4 + Number(left.assists ?? 0) * 3 + Number(left.yellowCards ?? 0) * -1 + Number(left.redCards ?? 0) * -3;
        const rightImpact = Number(right.goals ?? 0) * 4 + Number(right.assists ?? 0) * 3 + Number(right.yellowCards ?? 0) * -1 + Number(right.redCards ?? 0) * -3;
        return rightImpact - leftImpact;
    });
    const rankedFortress = [...fortress].sort((left, right) => {
        const leftPressure = Number(left.avgGoals ?? 0) * 3 + Number(left.avgPossession ?? 0);
        const rightPressure = Number(right.avgGoals ?? 0) * 3 + Number(right.avgPossession ?? 0);
        return rightPressure - leftPressure;
    });
    const maxLeaderImpact = rankedMatchLeaders.reduce((currentMax, player) => {
        const impact = Number(player.goals ?? 0) * 4 + Number(player.assists ?? 0) * 3 + Number(player.yellowCards ?? 0) * -1 + Number(player.redCards ?? 0) * -3;
        return Math.max(currentMax, impact);
    }, 0);
    const maxFortressPressure = rankedFortress.reduce((currentMax, team) => {
        const pressure = Number(team.avgGoals ?? 0) * 3 + Number(team.avgPossession ?? 0);
        return Math.max(currentMax, pressure);
    }, 0);

    const mergedRadar = ['Possession', 'Shots On Target', 'Fouls'].map((metric) => {
        const item = { metric };
        comparison.forEach((team) => {
            item[team.teamName] = metricValue(team, metric);
        });
        return item;
    });
    const momentumPhases = getMomentumPhases(timeline, featuredTeams[0]?.teamName, featuredTeams[1]?.teamName);
    const totalShots = featuredTeams.reduce((sum, team) => sum + Number(team.shotsOnTarget ?? 0), 0);
    const totalPossession = featuredTeams.map((team) => `${team.teamName}: ${team.possession ?? 0}%`).join(' / ');
    const totalFouls = featuredTeams.reduce((sum, team) => sum + Number(team.fouls ?? 0), 0);
    const oracleInsight = oracle?.statusLabel
        ? `${oracle.statusLabel}. ${featuredTeams[0]?.teamName || 'Home'} vs ${featuredTeams[1]?.teamName || 'Away'} is trending ${oracle.confidenceBand?.toLowerCase?.() || 'balanced'} through the current event profile.`
        : 'The match remains tactically balanced, with transitions and event timing shaping the current pulse.';

    return (
        <div className="page-shell">
            <section className="panel match-center-hero">
                <div className="match-center-hero-main">
                    <div className="match-center-hero-head">
                        <div>
                            <p className="section-kicker">Match Center</p>
                            <h2 className="hero-title">Live football control room</h2>
                        </div>
                        <AiPulseBadge label="Neural Forecast" />
                    </div>

                    <article className="featured-fixture-console">
                        <div className="featured-fixture-status-row">
                            <div className={`match-status-badge ${statusTone}`}>
                                <span className="match-status-dot" />
                                {featuredMatch?.status || 'Scheduled'}
                            </div>
                            <div className="featured-fixture-tags">
                                <span>{featuredMatch?.stage || 'Stage TBD'}</span>
                                <span>{timeline.length || featuredMatch?.eventCount || 0} Events</span>
                                <span>High Intensity</span>
                            </div>
                        </div>

                        <div className="featured-fixture-scoreboard">
                            <div className="featured-team-side home">
                                <strong>{featuredTeams[0]?.teamName || 'Home Team'}</strong>
                            </div>
                            <div className="featured-score-core">
                                <h3>
                                    {featuredMatch?.matchId
                                        ? <Link to={`/matches/${featuredMatch.matchId}`}>{featuredMatch?.scoreline || '0 - 0'}</Link>
                                        : (featuredMatch?.scoreline || '0 - 0')}
                                </h3>
                            </div>
                            <div className="featured-team-side away">
                                <strong>{featuredTeams[1]?.teamName || 'Away Team'}</strong>
                            </div>
                        </div>

                        <div className="featured-fixture-meta">
                            <span>
                                <Icon icon={Icons.stadium} size={15} className="landing-meta-lucide" />
                                {featuredMatch?.stadiumName || 'Unknown venue'}, {featuredMatch?.city || 'Unknown city'}
                            </span>
                            <span>
                                <Icon icon={Icons.time} size={15} className="landing-meta-lucide" />
                                {formatDateTime(featuredMatch?.matchDate)}
                            </span>
                            <span>
                                <Icon icon={Icons.referee} size={15} className="landing-meta-lucide" />
                                Ref: {featuredMatch?.refereeName || 'Referee TBD'}
                            </span>
                        </div>
                    </article>
                </div>

                <article className="panel match-center-timeline-preview">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Timeline Preview</p>
                            <h3>Last three actions</h3>
                        </div>
                    </div>

                    <div className="timeline-preview-list">
                        {timelinePreview.length ? timelinePreview.map((event) => (
                            <div key={event.eventId} className="timeline-preview-item">
                                <div className="timeline-preview-icon">
                                    <Icon icon={getTimelineIcon(event.eventType)} size={16} />
                                </div>
                                <div className="timeline-preview-copy">
                                    <strong>{event.eventType.replaceAll('_', ' ')}</strong>
                                    <small>{event.playerId ? <Link to={`/players/${event.playerId}`}>{event.playerName}</Link> : event.playerName}</small>
                                </div>
                                <span className="timeline-preview-minute">{event.minute}'</span>
                            </div>
                        )) : (
                            <EmptyState
                                tone="neutral"
                                title="No events recorded yet"
                                description="This match has not produced any major events so far."
                                hint="Check again as the fixture develops."
                            />
                        )}
                    </div>
                </article>
            </section>

            {loading && <div className="empty-panel">Loading Match Center...</div>}
            {error && <div className="empty-panel error-panel">{error}</div>}

            <section className="panel strip-panel">
                <div className="panel-head">
                    <div>
                        <p className="section-kicker">Fixture Strip</p>
                        <h3>Recent match pulse</h3>
                    </div>
                    <span className="panel-tag">Last six fixtures</span>
                </div>

                <div className="fixture-strip fixture-carousel">
                    {fixtureStrip.map((fixture) => (
                        <Link
                            key={fixture.matchId}
                            to={`/matches/${fixture.matchId}`}
                            className={`fixture-tile linked-item ${fixture.matchId === featuredMatch?.matchId ? 'current-fixture' : ''}`}
                        >
                            <div className="fixture-tile-head">
                                <span className={`fixture-status-pill ${getStatusTone(fixture.status)}`}>{fixture.status}</span>
                            </div>
                            <strong>{fixture.matchLabel || `Match ${fixture.matchId}`}</strong>
                            <span>{fixture.stage}</span>
                            <small>{fixture.teamsTracked} teams | {fixture.eventCount} events</small>
                            <small>{formatDateTime(fixture.matchDate)}</small>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="content-grid analysis-zone">
                <article className="panel timeline-panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Event Timeline</p>
                            <h3>Chronological pulse</h3>
                        </div>
                    </div>

                    <div className="timeline intelligence-timeline">
                        {timeline.length ? timeline.map((event) => (
                            <div key={event.eventId} className={`timeline-item narrative-timeline-item ${getTimelineTone(event.eventType)}`}>
                                <span className="timeline-minute">{event.minute}'</span>
                                <div className="timeline-event-icon">
                                    <Icon icon={getTimelineIcon(event.eventType)} size={15} />
                                </div>
                                <div className="timeline-copy-block">
                                    <strong>{event.playerId ? <Link to={`/players/${event.playerId}`}>{event.playerName}</Link> : event.playerName}</strong>
                                    <p>{event.eventType.replaceAll('_', ' ')}</p>
                                </div>
                            </div>
                        )) : (
                            <EmptyState
                                tone="neutral"
                                title="No events recorded yet"
                                description="This fixture has not produced a chronological event feed yet."
                                hint="The timeline will populate as goals, cards, and assists are logged."
                            />
                        )}
                    </div>
                </article>

                <article className="panel ref-panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Ref Watch</p>
                            <h3>Strictness profile</h3>
                        </div>
                    </div>

                    <div className="ref-grid intelligence-ref-grid">
                        <div className="ref-stat intelligence-ref-stat">
                            <span><Icon icon={Icons.referee} size={14} className="landing-meta-lucide" />Referee</span>
                            <strong>{refWatch.refereeName || 'Pending'}</strong>
                        </div>
                        <div className="ref-stat intelligence-ref-stat">
                            <span><Icon icon={Icons.stadium} size={14} className="landing-meta-lucide" />Nationality</span>
                            <strong>{refWatch.nationality || 'N/A'}</strong>
                        </div>
                        <div className="ref-stat intelligence-ref-stat">
                            <span><Icon icon={Icons.time} size={14} className="landing-meta-lucide" />Experience</span>
                            <strong>{refWatch.experienceYears ?? 0}y</strong>
                        </div>
                        <div className="ref-stat intelligence-ref-stat">
                            <span><Icon icon={Icons.match} size={14} className="landing-meta-lucide" />Matches</span>
                            <strong>{refWatch.matchesOfficiated ?? 0}</strong>
                        </div>
                        <div className="ref-stat intelligence-ref-stat caution">
                            <span><Icon icon={Icons.ai} size={14} className="landing-meta-lucide" />Avg Yellows</span>
                            <strong>{Number(refWatch.avgYellowCards ?? 0).toFixed(1)}</strong>
                            <div className="ref-meter-track"><div className="ref-meter-fill caution-fill" style={{ width: `${Math.min((Number(refWatch.avgYellowCards ?? 0) / 8) * 100, 100)}%` }} /></div>
                        </div>
                        <div className="ref-stat intelligence-ref-stat strictness">
                            <span><Icon icon={Icons.stats} size={14} className="landing-meta-lucide" />Strictness</span>
                            <strong>{Number(refWatch.strictnessIndex ?? 0).toFixed(2)}</strong>
                            <div className="ref-meter-track"><div className="ref-meter-fill strictness-fill" style={{ width: `${Math.min(Number(refWatch.strictnessIndex ?? 0) * 10, 100)}%` }} /></div>
                        </div>
                    </div>
                    <p className="support-copy">
                        Avg reds: {Number(refWatch.avgRedCards ?? 0).toFixed(1)} | Avg fouls: {Number(refWatch.avgFouls ?? 0).toFixed(1)}
                    </p>
                </article>
            </section>

            <section className="panel oracle-dashboard-panel">
                <div className="panel-head">
                    <div>
                        <p className="section-kicker">Neural Prediction</p>
                        <h3>Match intelligence</h3>
                    </div>
                </div>

                <div className="oracle-wrap oracle-wrap-wide">
                    <MatchOracle oracle={oracle} comparison={comparison} featuredTeams={featuredTeams} layout="wide" />
                </div>
            </section>

            <section className="content-grid comparison-zone">
                <article className="panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Scoreboard Detail</p>
                            <h3>Team-by-team breakdown</h3>
                        </div>
                    </div>

                    <div className="scoreboard-grid">
                        {featuredTeams.map((team, index) => {
                            const opponent = featuredTeams[index === 0 ? 1 : 0];

                            return (
                                <article key={team.teamId} className="team-summary visual-team-summary">
                                    <div className="team-summary-head">
                                        <div>
                                            <h4><Link to={`/teams/${team.teamId}`}>{team.teamName}</Link></h4>
                                            <small>{team.homeCity} | {team.possession}% possession</small>
                                        </div>
                                        <div className="team-score">{team.goals ?? 0}</div>
                                    </div>

                                    <div className="team-breakdown-list">
                                        {breakdownMetrics.map((metric) => {
                                            const currentValue = Number(team?.[metric.key] ?? 0);
                                            const opponentValue = Number(opponent?.[metric.key] ?? 0);
                                            const total = Math.max(currentValue + opponentValue, 1);
                                            const currentWidth = `${(currentValue / total) * 100}%`;
                                            const opponentWidth = `${(opponentValue / total) * 100}%`;
                                            const isWinner = currentValue > opponentValue;
                                            const isLoser = currentValue < opponentValue;

                                            return (
                                                <div key={`${team.teamId}-${metric.key}`} className="team-breakdown-row">
                                                    <div className="team-breakdown-label">
                                                        <Icon icon={metric.icon} size={14} className="landing-meta-lucide" />
                                                        <span>{metric.label}</span>
                                                    </div>
                                                    <div className="team-breakdown-bars">
                                                        <div className={`team-breakdown-side ${isWinner ? 'winner' : isLoser ? 'loser' : ''}`}>
                                                            <div className="team-breakdown-track">
                                                                <div className="team-breakdown-fill home-fill" style={{ width: currentWidth }} />
                                                            </div>
                                                            <strong>{currentValue}</strong>
                                                        </div>
                                                        <small>vs</small>
                                                        <div className={`team-breakdown-side opponent ${isWinner ? 'loser' : isLoser ? 'winner' : ''}`}>
                                                            <strong>{opponentValue}</strong>
                                                            <div className="team-breakdown-track">
                                                                <div className="team-breakdown-fill away-fill" style={{ width: opponentWidth }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </article>

                <article className="panel chart-panel comparison-chart-panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Team Comparison</p>
                            <h3>Radar battle</h3>
                        </div>
                    </div>

                    {comparison.length >= 2 ? (
                        <div className="radar-battle-shell">
                            <div className="radar-battle-glow" />
                            <ResponsiveContainer width="100%" height={320}>
                                <RadarChart data={mergedRadar}>
                                    <PolarGrid stroke="rgba(148, 163, 184, 0.16)" />
                                    <PolarAngleAxis dataKey="metric" stroke="#d8f3dc" />
                                    <PolarRadiusAxis stroke="rgba(148, 163, 184, 0.26)" />
                                    <Radar
                                        name={comparison[0].teamName}
                                        dataKey={comparison[0].teamName}
                                        stroke="#6ee7b7"
                                        fill="#6ee7b7"
                                        fillOpacity={0.22}
                                    />
                                    <Radar
                                        name={comparison[1].teamName}
                                        dataKey={comparison[1].teamName}
                                        stroke="#60a5fa"
                                        fill="#60a5fa"
                                        fillOpacity={0.18}
                                    />
                                    <Tooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                            <div className="radar-legend-grid">
                                {comparison.slice(0, 2).map((team, index) => (
                                    <article key={team.teamName} className="radar-legend-card">
                                        <div className="radar-legend-head">
                                            <span className={`radar-legend-dot ${index === 0 ? 'home' : 'away'}`} />
                                            <strong>{team.teamName}</strong>
                                        </div>
                                        <div className="radar-legend-values">
                                            <span>Possession ({team.possession ?? 0}%)</span>
                                            <span>Shots on target ({team.shotsOnTarget ?? 0})</span>
                                            <span>Fouls ({team.fouls ?? 0})</span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            tone="missing"
                            title="Data unavailable"
                            description="This comparison is not currently available in the dataset."
                            hint="The radar battle needs stat rows for both teams in the featured match."
                        />
                    )}
                </article>
            </section>

            <section className="content-grid support-zone">
                <div className="support-left-column">
                <article className="panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Match Leaders</p>
                            <h3>Player impact in this fixture</h3>
                        </div>
                    </div>

                    <div className="leaderboard-list">
                        {rankedMatchLeaders.map((player, index) => {
                            const impact = Number(player.goals ?? 0) * 4 + Number(player.assists ?? 0) * 3 + Number(player.yellowCards ?? 0) * -1 + Number(player.redCards ?? 0) * -3;
                            const impactWidth = maxLeaderImpact > 0 ? `${Math.max((impact / maxLeaderImpact) * 100, 8)}%` : '8%';
                            return (
                                <div
                                    key={`${player.playerName}-${index}`}
                                    className={`leaderboard-row compact-leaderboard-row player-impact-row ${index === 0 ? 'leaderboard-top mvp-row' : ''}`}
                                >
                                    <div className="leaderboard-rank">{index === 0 ? 'MVP' : `#${index + 1}`}</div>
                                    <div className="leaderboard-body">
                                        <strong>{player.playerId ? <Link to={`/players/${player.playerId}`}>{player.playerName}</Link> : player.playerName}</strong>
                                        <small>{player.position}</small>
                                        <div className="impact-stat-row">
                                            <span><Icon icon={Icons.goals} size={14} className="landing-meta-lucide" />{player.goals ?? 0}</span>
                                            <span><Icon icon={Icons.assists} size={14} className="landing-meta-lucide" />{player.assists ?? 0}</span>
                                            <span><Icon icon={Icons.ai} size={14} className="landing-meta-lucide" />{player.yellowCards ?? 0}</span>
                                            <span><Icon icon={Icons.stats} size={14} className="landing-meta-lucide" />{player.redCards ?? 0}</span>
                                        </div>
                                        {index === 0 && <span className="mvp-badge">Match MVP</span>}
                                        <small>Impact Score</small>
                                        <div className="leaderboard-bar">
                                            <div className="leaderboard-bar-fill revenue-fill" style={{ width: impactWidth }} />
                                        </div>
                                    </div>
                                    <div className="leaderboard-value">{impact}</div>
                                </div>
                            );
                        })}
                    </div>
                </article>

                <article className="panel mini-insight-panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Match Momentum</p>
                            <h3>AI insight and phase control</h3>
                        </div>
                    </div>

                    <div className="mini-insight-shell">
                        <div className="mini-insight-callout">
                            <strong>AI Tactical Insight</strong>
                            <p>{oracleInsight}</p>
                        </div>

                        <div className="mini-stats-grid">
                            <div className="mini-stat-card">
                                <span>Total shots</span>
                                <strong>{totalShots}</strong>
                            </div>
                            <div className="mini-stat-card">
                                <span>Total fouls</span>
                                <strong>{totalFouls}</strong>
                            </div>
                            <div className="mini-stat-card wide">
                                <span>Possession split</span>
                                <strong>{totalPossession}</strong>
                            </div>
                        </div>

                        <div className="momentum-phase-list">
                            {momentumPhases.map((phase) => (
                                <div key={phase.label} className="momentum-phase-row">
                                    <div className="momentum-phase-head">
                                        <strong>{phase.label}</strong>
                                        <span>{phase.winner}</span>
                                    </div>
                                    <div className="momentum-phase-track">
                                        <div className="momentum-phase-fill home" style={{ width: phase.homeShare }} />
                                        <div className="momentum-phase-fill away" style={{ width: phase.awayShare }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
                </div>

                <article className="panel venue-pressure-panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Home Fortress</p>
                            <h3>Venue pressure</h3>
                        </div>
                    </div>

                    <div className="leaderboard-list venue-pressure-scroll">
                        {rankedFortress.map((team, index) => {
                            const pressure = Number(team.avgGoals ?? 0) * 3 + Number(team.avgPossession ?? 0);
                            const pressureWidth = maxFortressPressure > 0 ? `${Math.max((pressure / maxFortressPressure) * 100, 8)}%` : '8%';
                            const pressureLevel = pressure >= 60 ? 'High' : pressure >= 45 ? 'Elevated' : 'Measured';
                            return (
                                <div
                                    key={team.teamId}
                                    className={`leaderboard-row compact-leaderboard-row venue-pressure-row ${index === 0 ? 'leaderboard-top' : ''}`}
                                >
                                    <div className={`leaderboard-rank venue-rank-badge rank-${index + 1}`}>{getRankLabel(index)}</div>
                                    <div className="leaderboard-body">
                                        <strong><Link to={`/teams/${team.teamId}`}>{team.teamName}</Link></strong>
                                        <small>{team.stadiumName}</small>
                                        <small>Avg goals {Number(team.avgGoals ?? 0).toFixed(2)} | Avg possession {Number(team.avgPossession ?? 0).toFixed(1)}%</small>
                                        <div className="venue-pressure-meta">
                                            <span>{pressureLevel} pressure</span>
                                            <span>Score {pressure.toFixed(1)} / 100</span>
                                        </div>
                                        <div className="leaderboard-bar">
                                            <div className="leaderboard-bar-fill roi-fill" style={{ width: pressureWidth }} />
                                        </div>
                                    </div>
                                    <div className="leaderboard-value">{pressure.toFixed(1)}</div>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </section>
        </div>
    );
};

export default MatchCenter;
