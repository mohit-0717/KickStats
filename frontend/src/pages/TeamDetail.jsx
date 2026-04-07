import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { Icons } from '../constants/icons';
import { fetchTeamDetail, getErrorMessage } from '../services/api';

const formatMoney = (value) => {
    if (value === null || value === undefined) {
        return 'N/A';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
};

const TeamDetail = () => {
    const { teamId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;

        const load = async () => {
            setLoading(true);
            try {
                const response = await fetchTeamDetail(teamId);
                if (active) {
                    setData(response);
                    setError(null);
                }
            } catch (requestError) {
                if (active) {
                    setError(getErrorMessage(requestError, 'Failed to load team detail'));
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
    }, [teamId]);

    const standing = data?.standing ?? {};
    const sponsors = data?.sponsors ?? [];
    const financial = data?.financialHeader ?? {};
    const recentMatches = data?.recentMatches ?? [];
    const goalDiff = Number(standing.goalsFor ?? 0) - Number(standing.goalsAgainst ?? 0);
    const formTone = goalDiff > 0 ? 'Stable build' : goalDiff === 0 ? 'Balanced profile' : 'Recovery needed';

    return (
        <div className="page-shell">
            <div className="detail-breadcrumbs">
                <Link to="/portals">Portals</Link>
                <span>/</span>
                <span>{data?.teamName || `Team ${teamId}`}</span>
            </div>

            {loading && <div className="empty-panel">Loading team detail...</div>}
            {error && <div className="empty-panel error-panel">{error}</div>}

            {data && (
                <>
                    <section className="hero-panel team-detail-hero">
                        <div className="hero-copy-block">
                            <p className="section-kicker">Team Page</p>
                            <h2 className="hero-title">{data.teamName}</h2>
                            <div className="player-identity-row">
                                <span><Icon icon={Icons.stadium} size={14} className="landing-meta-lucide" />{data.homeCity}</span>
                                <span>Founded {data.foundedYear || 'N/A'}</span>
                                <span>Manager {data.managerName || 'N/A'}</span>
                            </div>
                            <div className="chip-row">
                                <span>{data.stadiumName}</span>
                                <span>Position #{standing.leaguePosition ?? 'N/A'}</span>
                                <span>{standing.points ?? 0} points</span>
                            </div>
                            <div className="player-hero-strip">
                                <div className="status-pill available">{formTone}</div>
                                <small>{sponsors.length} sponsors attached | {standing.matchesPlayed ?? 0} league matches indexed</small>
                            </div>
                        </div>

                        <article className="match-card team-financial-card">
                            <p className="section-kicker">Financial Header</p>
                            <div className="portal-metrics">
                                <div><span>Sponsors</span><strong>{sponsors.length}</strong></div>
                                <div><span>Total Value</span><strong>{formatMoney(financial.totalSponsorshipValue)}</strong></div>
                                <div><span>Value / Position</span><strong>{financial.sponsorValuePerPosition ?? 'N/A'}</strong></div>
                            </div>
                            <div className="mini-stats-grid">
                                <div className="mini-stat-card">
                                    <span>Goal Diff</span>
                                    <strong>{goalDiff}</strong>
                                </div>
                                <div className="mini-stat-card">
                                    <span>League Rank</span>
                                    <strong>#{standing.leaguePosition ?? 'N/A'}</strong>
                                </div>
                                <div className="mini-stat-card wide">
                                    <span>Commercial Pulse</span>
                                    <strong>{formatMoney(financial.totalSponsorshipValue)} total sponsorship weight</strong>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section className="content-grid compact-top">
                        <article className="panel">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Standing</p>
                                    <h3>League performance</h3>
                                </div>
                            </div>
                            <div className="portal-metrics">
                                <div><span>Wins</span><strong>{standing.wins ?? 0}</strong></div>
                                <div><span>Draws</span><strong>{standing.draws ?? 0}</strong></div>
                                <div><span>Losses</span><strong>{standing.losses ?? 0}</strong></div>
                            </div>
                            <div className="mini-stats-grid">
                                <div className="mini-stat-card">
                                    <span>Goals For</span>
                                    <strong>{standing.goalsFor ?? 0}</strong>
                                </div>
                                <div className="mini-stat-card">
                                    <span>Goals Against</span>
                                    <strong>{standing.goalsAgainst ?? 0}</strong>
                                </div>
                                <div className="mini-stat-card wide">
                                    <span>Matches Played</span>
                                    <strong>{standing.matchesPlayed ?? 0}</strong>
                                </div>
                            </div>
                        </article>

                        <article className="sub-panel leaderboard-panel revenue-leaderboard team-sponsor-panel">
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Sponsors</p>
                                    <h3>Commercial backing</h3>
                                </div>
                            </div>
                            <div className="leaderboard-list">
                                {sponsors.map((sponsor, index) => (
                                    <div key={`${sponsor.sponsorName}-${index}`} className={`leaderboard-row ${index === 0 ? 'leaderboard-top' : ''}`}>
                                        <div className="leaderboard-rank">#{index + 1}</div>
                                        <div className="leaderboard-body">
                                            <strong>{sponsor.sponsorName}</strong>
                                            <small>{sponsor.industry} | {sponsor.country}</small>
                                            <small>{formatMoney(sponsor.sponsorshipValue)} | {sponsor.contractStart} to {sponsor.contractEnd}</small>
                                        </div>
                                        <div className="leaderboard-value">{formatMoney(sponsor.sponsorshipValue)}</div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </section>

                    <section className="panel">
                        <div className="panel-head">
                            <div>
                                <p className="section-kicker">Recent Matches</p>
                                <h3>Team match log</h3>
                            </div>
                        </div>
                        <div className="stack-list team-match-log">
                            {recentMatches.map((match) => (
                                <Link key={match.matchId} to={`/matches/${match.matchId}`} className="stack-item linked-item player-match-card">
                                    <strong>{match.stage} | Match {match.matchId}</strong>
                                    <span>{match.matchDate ? new Date(match.matchDate).toLocaleString() : 'TBD'}</span>
                                    <div className="impact-stat-row">
                                        <span><Icon icon={Icons.goals} size={14} className="landing-meta-lucide" />{match.goals ?? 0}</span>
                                        <span><Icon icon={Icons.stats} size={14} className="landing-meta-lucide" />{match.possession ?? 0}%</span>
                                        <span><Icon icon={Icons.live} size={14} className="landing-meta-lucide" />{match.shotsOnTarget ?? 0}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default TeamDetail;
