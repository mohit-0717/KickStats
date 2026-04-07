import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AiPulseBadge from '../components/AiPulseBadge';
import AiScoutingReport from '../components/AiScoutingReport';
import EmptyState from '../components/common/EmptyState';
import Icon from '../components/common/Icon';
import { Icons } from '../constants/icons';
import { fetchPlayerDetail, getErrorMessage } from '../services/api';

const formatMoney = (value) => {
    if (value === null || value === undefined || value === '') {
        return 'Undisclosed';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
};

const PlayerDetail = () => {
    const { playerId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const response = await fetchPlayerDetail(playerId);
                if (active) {
                    setData(response);
                    setError(null);
                }
            } catch (requestError) {
                if (active) {
                    setError(getErrorMessage(requestError, 'Failed to load player detail'));
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
    }, [playerId]);

    const summary = data?.summary ?? {};
    const transfers = data?.careerTimeline ?? [];
    const injuries = data?.injuryTimeline ?? [];
    const matches = data?.matchLog ?? [];
    const aiReport = data?.aiScoutingReport ?? {};
    const availabilityTone = injuries.length ? 'injured' : 'available';
    const latestMove = transfers[0];

    return (
        <div className="page-shell">
            <div className="detail-breadcrumbs">
                <Link to="/portals">Portals</Link>
                <span>/</span>
                <span>{data?.playerName || `Player ${playerId}`}</span>
            </div>

            {loading && <div className="empty-panel">Loading player detail...</div>}
            {error && <div className="empty-panel error-panel">{error}</div>}

            {data && (
                <>
                    <section className="hero-panel player-detail-hero">
                        <div className="hero-copy-block">
                            <p className="section-kicker">Player Page</p>
                            <div className="title-with-badge detail-title-row">
                                <h2 className="hero-title">{data.playerName}</h2>
                                <AiPulseBadge label="AI Scouting" />
                            </div>
                            <div className="player-identity-row">
                                <span><Icon icon={Icons.stadium} size={14} className="landing-meta-lucide" />{data.nationality}</span>
                                <span>{data.position}</span>
                                <span>{data.preferredFoot} foot</span>
                                <span>Age {data.age ?? 'N/A'}</span>
                            </div>
                            <div className="chip-row">
                                <span>{data.height}m</span>
                                <span>{data.weight}kg</span>
                                <span>{summary.matchesTracked ?? 0} matches tracked</span>
                                <span>{data.currentTeam || 'Unassigned club'}</span>
                            </div>
                            <div className="player-hero-strip">
                                <div className={`status-pill ${availabilityTone}`}>
                                    {injuries.length ? 'Medical Risk' : 'Available'}
                                </div>
                                <small>
                                    {latestMove
                                        ? `Latest move: ${latestMove.toTeam || 'Unknown club'} | ${formatMoney(latestMove.transferFee)}`
                                        : 'No recent transfer movement recorded'}
                                </small>
                            </div>
                        </div>

                        <article className="match-card player-form-card">
                            <p className="section-kicker">Form Snapshot</p>
                            <div className="portal-metrics player-form-metrics">
                                <div><span>Goals</span><strong>{summary.totalGoals ?? 0}</strong></div>
                                <div><span>Assists</span><strong>{summary.totalAssists ?? 0}</strong></div>
                                <div><span>Minutes</span><strong>{summary.totalMinutes ?? 0}</strong></div>
                            </div>
                            <div className="mini-stats-grid">
                                <div className="mini-stat-card">
                                    <span>Cards</span>
                                    <strong>{(summary.totalYellowCards ?? 0) + (summary.totalRedCards ?? 0)}</strong>
                                </div>
                                <div className="mini-stat-card">
                                    <span>Matches</span>
                                    <strong>{summary.matchesTracked ?? 0}</strong>
                                </div>
                                <div className="mini-stat-card wide">
                                    <span>Scouting Verdict</span>
                                    <strong>{injuries.length ? 'Talent with availability risk' : 'Stable selection profile'}</strong>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section className="content-grid compact-top">
                        <article className="panel">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">AI Intelligence</p>
                                    <h3>Scouting report</h3>
                                </div>
                            </div>
                            <AiScoutingReport report={aiReport} />
                        </article>

                        <article className="panel">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Career Timeline</p>
                                    <h3>Club moves</h3>
                                </div>
                            </div>
                            <div className="timeline">
                                {transfers.map((transfer) => (
                                    <div key={transfer.transferId} className="timeline-item wide-item narrative-timeline-item assist">
                                        <span className="timeline-minute">{transfer.transferDate ? new Date(transfer.transferDate).getFullYear() : 'TBD'}</span>
                                        <div className="timeline-event-icon">
                                            <Icon icon={Icons.transfers} size={15} />
                                        </div>
                                        <div className="timeline-copy-block">
                                            <strong>{transfer.fromTeam || 'Unknown'} to {transfer.toTeam || 'Unknown'}</strong>
                                            <p>Fee {formatMoney(transfer.transferFee)} | Contract {transfer.contractLength ?? 'N/A'} years</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </section>

                    <section className="content-grid compact-top">
                        <article className="panel">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Injury Timeline</p>
                                    <h3>Medical history</h3>
                                </div>
                            </div>
                            <div className="stack-list player-medical-list">
                                {injuries.map((injury) => (
                                    <div key={injury.injuryId} className="stack-item player-medical-card">
                                        <strong>{injury.injuryType}</strong>
                                        <span>{injury.returnDate ? `Return ${new Date(injury.returnDate).toLocaleDateString()}` : 'Return date TBD'}</span>
                                        <small>{data.playerName} is flagged in the medical register for monitored availability.</small>
                                    </div>
                                ))}
                                {!injuries.length && (
                                    <EmptyState
                                        tone="neutral"
                                        title="No injuries recorded for this player"
                                        description="This player has maintained a clean fitness record in the tracked dataset."
                                        hint="Medical events will appear here if availability changes."
                                    />
                                )}
                            </div>
                        </article>

                        <article className="panel">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Match Log</p>
                                    <h3>Player stats by fixture</h3>
                                </div>
                            </div>
                            <div className="stack-list player-match-log">
                            {matches.map((match) => (
                                <Link key={match.matchId} to={`/matches/${match.matchId}`} className="stack-item linked-item player-match-card">
                                    <strong>{match.stage} | Match {match.matchId}</strong>
                                    <span>{match.matchDate ? new Date(match.matchDate).toLocaleString() : 'TBD'}</span>
                                    <div className="impact-stat-row">
                                        <span><Icon icon={Icons.goals} size={14} className="landing-meta-lucide" />{match.goals ?? 0}</span>
                                        <span><Icon icon={Icons.assists} size={14} className="landing-meta-lucide" />{match.assists ?? 0}</span>
                                        <span><Icon icon={Icons.time} size={14} className="landing-meta-lucide" />{match.minutesPlayed ?? 0}</span>
                                    </div>
                                </Link>
                            ))}
                            </div>
                        </article>
                    </section>
                </>
            )}
        </div>
    );
};

export default PlayerDetail;
