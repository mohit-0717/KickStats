import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AiPulseBadge from '../components/AiPulseBadge';
import EmptyState from '../components/common/EmptyState';
import MatchOracle from '../components/MatchOracle';
import Icon from '../components/common/Icon';
import { Icons } from '../constants/icons';
import { fetchMatchDetail, getErrorMessage } from '../services/api';

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

const MatchDetail = () => {
    const { matchId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const response = await fetchMatchDetail(matchId);
                if (active) {
                    setData(response);
                    setError(null);
                }
            } catch (requestError) {
                if (active) {
                    setError(getErrorMessage(requestError, 'Failed to load match detail'));
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [matchId]);

    const teams = data?.teams ?? [];
    const events = data?.eventTimeline ?? [];
    const momentum = data?.momentumChart ?? [];
    const referee = data?.referee ?? {};
    const oracle = data?.oracle ?? {};
    const statusTone = getStatusTone(data?.status);
    const timelinePreview = events.slice(-3).reverse();

    return (
        <div className="page-shell">
            <div className="detail-breadcrumbs">
                <Link to="/match-center">Match Center</Link>
                <span>/</span>
                <span>{data?.matchLabel || `Match ${matchId}`}</span>
            </div>

            {loading && <div className="empty-panel">Loading match detail...</div>}
            {error && <div className="empty-panel error-panel">{error}</div>}

            {data && (
                <>
                    <section className="panel match-center-hero match-detail-hero">
                        <div className="match-center-hero-main">
                            <div className="match-center-hero-head">
                                <div>
                                    <p className="section-kicker">Match Detail</p>
                                    <h2 className="hero-title">Fixture intelligence board</h2>
                                </div>
                                <AiPulseBadge label="Neural Forecast" />
                            </div>

                            <article className="featured-fixture-console">
                                <div className="featured-fixture-status-row">
                                    <div className={`match-status-badge ${statusTone}`}>
                                        <span className="match-status-dot" />
                                        {data.status || 'Scheduled'}
                                    </div>
                                    <div className="featured-fixture-tags">
                                        <span>{data.stage || 'Stage TBD'}</span>
                                        <span>{data.eventCount ?? 0} Events</span>
                                        <span>{data.seasonName || 'Season'}</span>
                                    </div>
                                </div>

                                <div className="featured-fixture-scoreboard">
                                    <div className="featured-team-side home">
                                        <strong>{teams[0]?.teamName || 'Home Team'}</strong>
                                    </div>
                                    <div className="featured-score-core">
                                        <h3>{data.scoreline || '0 - 0'}</h3>
                                    </div>
                                    <div className="featured-team-side away">
                                        <strong>{teams[1]?.teamName || 'Away Team'}</strong>
                                    </div>
                                </div>

                                <div className="featured-fixture-meta">
                                    <span>
                                        <Icon icon={Icons.stadium} size={15} className="landing-meta-lucide" />
                                        {data.stadiumName || 'Unknown venue'}, {data.city || 'Unknown city'}
                                    </span>
                                    <span>
                                        <Icon icon={Icons.time} size={15} className="landing-meta-lucide" />
                                        {data.matchDate ? new Date(data.matchDate).toLocaleString() : 'TBD'}
                                    </span>
                                    <span>
                                        <Icon icon={Icons.referee} size={15} className="landing-meta-lucide" />
                                        Ref: {referee.refereeName || 'TBD'}
                                    </span>
                                </div>
                            </article>
                        </div>

                        <article className="panel match-center-timeline-preview match-detail-preview">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Ref Watch</p>
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
                                            <small>{event.playerName}</small>
                                        </div>
                                        <span className="timeline-preview-minute">{event.minute}'</span>
                                    </div>
                                )) : (
                                    <EmptyState
                                        tone="neutral"
                                        title="No events recorded yet"
                                        description="This match has not produced any major events so far."
                                        hint="The event feed will update once the fixture generates actions."
                                    />
                                )}
                            </div>

                            <div className="match-detail-ref-summary">
                                <span>{referee.refereeName || 'TBD'}</span>
                                <small>{referee.nationality || 'N/A'} | {referee.experienceYears ?? 0} years</small>
                            </div>
                        </article>
                    </section>

                    <section className="content-grid analysis-zone compact-top">
                        <article className="panel">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Scoreboard</p>
                                    <h3>Team split</h3>
                                </div>
                            </div>
                            <div className="scoreboard-grid">
                                {teams.map((team) => (
                                    <article key={team.teamId} className="team-summary visual-team-summary">
                                        <div className="team-summary-head">
                                            <div>
                                                <h4>
                                                    <Link to={`/teams/${team.teamId}`}>{team.teamName}</Link>
                                                </h4>
                                                <small>{team.possession ?? 0}% possession</small>
                                            </div>
                                            <div className="team-score">{team.goals ?? 0}</div>
                                        </div>
                                        <div className="team-breakdown-list">
                                            <div className="team-breakdown-row">
                                                <div className="team-breakdown-label">
                                                    <Icon icon={Icons.goals} size={14} className="landing-meta-lucide" />
                                                    <span>Shots on target</span>
                                                </div>
                                                <div className="team-breakdown-bars single">
                                                    <div className="team-breakdown-side winner">
                                                        <div className="team-breakdown-track">
                                                            <div className="team-breakdown-fill home-fill" style={{ width: `${Math.min((Number(team.shotsOnTarget ?? 0) / 12) * 100, 100)}%` }} />
                                                        </div>
                                                        <strong>{team.shotsOnTarget ?? 0}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="team-breakdown-row">
                                                <div className="team-breakdown-label">
                                                    <Icon icon={Icons.stats} size={14} className="landing-meta-lucide" />
                                                    <span>Fouls</span>
                                                </div>
                                                <div className="team-breakdown-bars single">
                                                    <div className="team-breakdown-side">
                                                        <div className="team-breakdown-track">
                                                            <div className="team-breakdown-fill away-fill" style={{ width: `${Math.min((Number(team.fouls ?? 0) / 20) * 100, 100)}%` }} />
                                                        </div>
                                                        <strong>{team.fouls ?? 0}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </article>

                        <article className="panel chart-panel match-detail-momentum-panel">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Momentum Chart</p>
                                    <h3>Who dominated which half</h3>
                                </div>
                            </div>
                            {momentum.length > 0 && teams.length >= 2 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={momentum}>
                                        <XAxis dataKey="period" stroke="#9ab0a5" />
                                        <YAxis stroke="#9ab0a5" />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="firstTeamMomentum" name={teams[0].teamName} stroke="#6ee7b7" fill="#6ee7b7" fillOpacity={0.3} />
                                        <Area type="monotone" dataKey="secondTeamMomentum" name={teams[1].teamName} stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState
                                    tone="missing"
                                    title="Data unavailable"
                                    description="Momentum data is not currently available in the dataset."
                                    hint="This panel needs tracked phase momentum for both teams."
                                />
                            )}
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
                            <MatchOracle oracle={oracle} comparison={teams} featuredTeams={teams} layout="wide" />
                        </div>
                    </section>

                    <section className="panel">
                        <div className="panel-head">
                            <div>
                                <p className="section-kicker">Event Timeline</p>
                                <h3>Match chronology</h3>
                            </div>
                        </div>
                        <div className="timeline">
                            {events.length ? events.map((event) => (
                                <div key={event.eventId} className={`timeline-item narrative-timeline-item ${getTimelineTone(event.eventType)}`}>
                                    <span className="timeline-minute">{event.minute}'</span>
                                    <div className="timeline-event-icon">
                                        <Icon icon={getTimelineIcon(event.eventType)} size={15} />
                                    </div>
                                    <div className="timeline-copy-block">
                                        <strong>{event.playerName}</strong>
                                        <p>{event.eventType.replaceAll('_', ' ')}</p>
                                    </div>
                                </div>
                            )) : (
                                <EmptyState
                                    tone="neutral"
                                    title="No events recorded yet"
                                    description="This match has not produced a full event chronology."
                                    hint="Once the fixture logs goals, cards, or assists, they will appear here."
                                />
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default MatchDetail;
