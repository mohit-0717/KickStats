import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AiPulseBadge from '../components/AiPulseBadge';
import EmptyState from '../components/common/EmptyState';
import Icon from '../components/common/Icon';
import { Icons } from '../constants/icons';
import { usePulseData } from '../hooks/usePulseData';
import { fetchPortalPlayers, getErrorMessage } from '../services/api';

const formatMoney = (value) => {
    if (value === null || value === undefined) {
        return 'No commercial data';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
};

const Portals = () => {
    const { data, loading, error } = usePulseData();
    const [activeTab, setActiveTab] = useState('players');
    const [playerSearch, setPlayerSearch] = useState('');
    const [playerDirectory, setPlayerDirectory] = useState({
        content: [],
        totalElements: 0,
        hasNext: false
    });
    const [playersPage, setPlayersPage] = useState(0);
    const [playersLoading, setPlayersLoading] = useState(false);
    const [playersError, setPlayersError] = useState(null);
    const playerScrollRef = useRef(null);
    const portals = data?.portals;
    const players = playerDirectory.content;
    const teams = [...(portals?.teamCards ?? [])].sort((left, right) => {
        const leftRank = Number(left.leaguePosition ?? Number.MAX_SAFE_INTEGER);
        const rightRank = Number(right.leaguePosition ?? Number.MAX_SAFE_INTEGER);
        return leftRank - rightRank;
    });
    const injuries = portals?.injuryReport ?? [];
    const boardroom = portals?.boardroom ?? [];
    const sponsorRoi = portals?.sponsorRoi ?? [];
    const scouting = portals?.scoutingDesk ?? {};
    const highlights = portals?.portalHighlights ?? {};

    const portalTabs = [
        { id: 'players', label: 'Players' },
        { id: 'clubs', label: 'Clubs' },
        { id: 'medical', label: 'Medical' },
        { id: 'market', label: 'Market' }
    ];

    const rankedBoardroom = [...boardroom].sort((left, right) => {
        const leftRevenue = Number(left.estimatedSeasonRevenue ?? 0);
        const rightRevenue = Number(right.estimatedSeasonRevenue ?? 0);
        return rightRevenue - leftRevenue;
    });

    const rankedSponsorRoi = [...sponsorRoi].sort((left, right) => {
        const leftScore = Number(left.roiScore ?? 0);
        const rightScore = Number(right.roiScore ?? 0);
        return rightScore - leftScore;
    });

    const maxRevenue = rankedBoardroom.reduce(
        (currentMax, club) => Math.max(currentMax, Number(club.estimatedSeasonRevenue ?? 0)),
        0
    );

    const maxRoi = rankedSponsorRoi.reduce(
        (currentMax, club) => Math.max(currentMax, Number(club.roiScore ?? 0)),
        0
    );

    const portalPlayerCount = playerDirectory.totalElements || portals?.playerCards?.length || 0;
    const activeInsight = useMemo(() => {
        if (activeTab === 'players') {
            return {
                title: 'Scouting Lens',
                text: `${portalPlayerCount} tracked players are searchable by role, club, nationality, and availability.`,
                tag: 'Player intelligence'
            };
        }
        if (activeTab === 'clubs') {
            return {
                title: 'Club Context',
                text: `${teams.length} clubs are ranked with league position, stadium context, and boardroom signals.`,
                tag: 'League structure'
            };
        }
        if (activeTab === 'medical') {
            return {
                title: 'Availability Watch',
                text: `${injuries.length} active injury records are shaping the current squad risk profile.`,
                tag: 'Medical pressure'
            };
        }
        return {
            title: 'Commercial Surface',
            text: `${rankedBoardroom.length} revenue leaders and ${rankedSponsorRoi.length} ROI leaders are tracked in the market view.`,
            tag: 'Market intelligence'
        };
    }, [activeTab, injuries.length, portalPlayerCount, rankedBoardroom.length, rankedSponsorRoi.length, teams.length]);

    const loadPlayersPage = async ({ page, search, replace }) => {
        setPlayersLoading(true);
        try {
            const response = await fetchPortalPlayers({
                page,
                size: 36,
                search
            });

            setPlayerDirectory((current) => ({
                ...response,
                content: replace ? (response.content ?? []) : [...current.content, ...(response.content ?? [])]
            }));
            setPlayersError(null);
        } catch (requestError) {
            setPlayersError(getErrorMessage(requestError, 'Failed to load player directory'));
        } finally {
            setPlayersLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'players') {
            return;
        }

        setPlayersPage(0);
        void loadPlayersPage({
            page: 0,
            search: playerSearch.trim(),
            replace: true
        });
    }, [activeTab, playerSearch]);

    const handlePlayerScroll = async (event) => {
        if (playersLoading || !playerDirectory.hasNext) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        const nearBottom = scrollHeight - scrollTop - clientHeight < 160;

        if (!nearBottom) {
            return;
        }

        const nextPage = playersPage + 1;
        setPlayersPage(nextPage);
        await loadPlayersPage({
            page: nextPage,
            search: playerSearch.trim(),
            replace: false
        });
    };

    return (
        <div className="page-shell">
            <section className="hero-panel portals-hero">
                <div className="hero-copy-block">
                    <p className="section-kicker">Deep Dive</p>
                    <h2 className="hero-title">Player and Team Portals</h2>
                    <div className="player-identity-row">
                        <span><Icon icon={Icons.matches} size={14} className="landing-meta-lucide" />Matches</span>
                        <span><Icon icon={Icons.transfers} size={14} className="landing-meta-lucide" />Transfers</span>
                        <span><Icon icon={Icons.stats} size={14} className="landing-meta-lucide" />Stats</span>
                        <span><Icon icon={Icons.ai} size={14} className="landing-meta-lucide" />AI Insights</span>
                    </div>
                    <div className="tab-row portal-tab-row" role="tablist" aria-label="Portal sections">
                        {portalTabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                className={`tab-chip ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <article className="match-card portal-summary-card">
                    <p className="section-kicker">Portal Surface</p>
                    <h3>{portalPlayerCount} players | {teams.length} clubs</h3>
                    <div className="mini-stats-grid">
                        <div className="mini-stat-card">
                            <span>Stat rows</span>
                            <strong>{highlights.trackedPlayerStatRows ?? 0}</strong>
                        </div>
                        <div className="mini-stat-card">
                            <span>Injuries</span>
                            <strong>{highlights.activeInjuries ?? 0}</strong>
                        </div>
                        <div className="mini-stat-card wide">
                            <span>Active tab</span>
                            <strong>{activeInsight.tag}</strong>
                        </div>
                    </div>
                </article>
            </section>

            {loading && <div className="empty-panel">Loading portals...</div>}
            {error && <div className="empty-panel error-panel">{error}</div>}

            <section className="stats-row kpi-row">
                <article className="stat-card">
                    <span>Active injuries</span>
                    <strong>{highlights.activeInjuries ?? 0}</strong>
                    <small>Current medical availability pressure</small>
                </article>
                <article className="stat-card">
                    <span>Transfers tracked</span>
                    <strong>{highlights.totalTransfers ?? 0}</strong>
                    <small>Career movement already indexed</small>
                </article>
                <article className="stat-card">
                    <span>Teams in standings</span>
                    <strong>{highlights.trackedTeams ?? 0}</strong>
                    <small>Clubs with league context attached</small>
                </article>
                <article className="stat-card">
                    <span>Player stat rows</span>
                    <strong>{highlights.trackedPlayerStatRows ?? 0}</strong>
                    <small>Form and output history available</small>
                </article>
            </section>

            <section className="panel portal-insight-panel">
                <div className="panel-head">
                    <div>
                        <p className="section-kicker">Portal Insight</p>
                        <h3>{activeInsight.title}</h3>
                    </div>
                    <span className="panel-tag">{activeInsight.tag}</span>
                </div>
                <p className="support-copy">{activeInsight.text}</p>
            </section>

            {activeTab === 'players' && (
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Players</p>
                            <h3>Physical and form guide</h3>
                        </div>
                        <div className="portal-search-meta">
                            <label className="portal-search-label" htmlFor="portal-player-search">Search players</label>
                            <input
                                id="portal-player-search"
                                type="search"
                                value={playerSearch}
                                onChange={(event) => setPlayerSearch(event.target.value)}
                                placeholder="Name, team, nationality, position..."
                                className="portal-search-input"
                            />
                            <span className="portal-search-count">
                                Showing {players.length} of {portalPlayerCount}
                            </span>
                        </div>
                    </div>

                    <div className="portal-player-scroll" ref={playerScrollRef} onScroll={(event) => void handlePlayerScroll(event)}>
                        <div className="card-grid three-up compact-card-grid">
                            {players.map((player) => (
                            <article key={player.playerId} className="portal-card player-focus-card">
                                <div className="portal-card-head">
                                    <div>
                                        <div className="title-with-badge">
                                            <h4><Link to={`/players/${player.playerId}`}>{player.playerName}</Link></h4>
                                            <AiPulseBadge label="Scouting" />
                                        </div>
                                        <p>{player.position} | {player.nationality}</p>
                                    </div>
                                    <span className={`status-pill ${player.availabilityStatus === 'Available' ? 'available' : 'injured'}`}>
                                        {player.availabilityStatus}
                                    </span>
                                </div>

                                <div className="chip-row">
                                    <span>Age {player.age ?? 'N/A'}</span>
                                    <span>{player.height}m</span>
                                    <span>{player.weight}kg</span>
                                    <span>{player.preferredFoot}</span>
                                </div>

                                <p className="support-copy">Current club: {player.currentTeam || 'Unassigned'}</p>

                                <div className="portal-metrics">
                                    <div><span>Goals</span><strong>{player.totalGoals ?? 0}</strong></div>
                                    <div><span>Assists</span><strong>{player.totalAssists ?? 0}</strong></div>
                                    <div><span>Form Index</span><strong>{Number(player.formIndex ?? 0).toFixed(2)}</strong></div>
                                </div>

                                <div className="mini-stats-grid portal-player-mini-grid">
                                    <div className="mini-stat-card">
                                        <span>Matches</span>
                                        <strong>{player.matchesTracked ?? 0}</strong>
                                    </div>
                                    <div className="mini-stat-card">
                                        <span>Minutes</span>
                                        <strong>{player.totalMinutes ?? 0}</strong>
                                    </div>
                                    <div className="mini-stat-card wide">
                                        <span>Discipline</span>
                                        <strong>{player.totalYellowCards ?? 0} YC | {player.totalRedCards ?? 0} RC</strong>
                                    </div>
                                </div>
                            </article>
                            ))}
                        </div>
                        {!players.length && !playersLoading && (
                            <EmptyState
                                tone="search"
                                title="No players found"
                                description="No players matched the current search."
                                hint="Try adjusting filters or searching by nationality, team, or position."
                            />
                        )}
                        {playersError && <div className="empty-panel error-panel compact">{playersError}</div>}
                        {playersLoading && <div className="empty-panel compact">Loading more players...</div>}
                    </div>
                </section>
            )}

            {activeTab === 'clubs' && (
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Clubs</p>
                            <h3>Boardroom and league structure</h3>
                        </div>
                    </div>

                    <div className="card-grid two-up compact-card-grid">
                        {teams.map((team) => (
                            <article key={team.teamId} className="portal-card club-focus-card">
                                <div className="portal-card-head">
                                    <div>
                                        <h4><Link to={`/teams/${team.teamId}`}>{team.teamName}</Link></h4>
                                        <p>{team.homeCity} | Founded {team.foundedYear || 'N/A'}</p>
                                    </div>
                                    <span className="status-pill neutral">#{team.leaguePosition ?? 'N/A'}</span>
                                </div>
                                <div className="chip-row">
                                    <span>{team.stadiumName || 'Unknown stadium'}</span>
                                    <span>{team.managerName || 'Unknown manager'}</span>
                                </div>
                                <div className="portal-metrics">
                                    <div><span>Points</span><strong>{team.points ?? 0}</strong></div>
                                    <div><span>Wins</span><strong>{team.wins ?? 0}</strong></div>
                                    <div><span>Goal Diff</span><strong>{(team.goalsFor ?? 0) - (team.goalsAgainst ?? 0)}</strong></div>
                                </div>
                                <div className="mini-stats-grid">
                                    <div className="mini-stat-card">
                                        <span>Draws</span>
                                        <strong>{team.draws ?? 0}</strong>
                                    </div>
                                    <div className="mini-stat-card">
                                        <span>Losses</span>
                                        <strong>{team.losses ?? 0}</strong>
                                    </div>
                                    <div className="mini-stat-card wide">
                                        <span>Stadium Capacity</span>
                                        <strong>{team.stadiumCapacity ?? 0}</strong>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {activeTab === 'medical' && (
                <section className="content-grid portal-focus-grid">
                    <article className="panel medical-panel">
                        <div className="panel-head">
                            <div>
                                <p className="section-kicker">Medical Room</p>
                                <h3>Injury report</h3>
                            </div>
                        </div>

                        <div className="stack-list compact-stack-list">
                            {injuries.map((injury) => (
                                <div key={injury.injuryId} className="stack-item medical-item">
                                    <strong><Link to={`/players/${injury.playerId ?? ''}`}>{injury.playerName}</Link></strong>
                                    <span>{injury.position}</span>
                                    <small>{injury.injuryType} | Return {injury.returnDate ? new Date(injury.returnDate).toLocaleDateString() : 'TBD'}</small>
                                </div>
                            ))}
                            {!injuries.length && (
                                <EmptyState
                                    tone="neutral"
                                    title="No injuries recorded yet"
                                    description="There are no active injury records in the current medical feed."
                                    hint="This panel will update as new medical entries are added."
                                />
                            )}
                        </div>
                    </article>

                    <article className="panel">
                        <div className="panel-head">
                            <div>
                                <p className="section-kicker">Scouting Desk</p>
                                <h3>Target filters</h3>
                            </div>
                        </div>

                        <div className="scouting-split">
                            <div>
                                <h4>Tallest defenders</h4>
                                <div className="stack-list compact-stack-list">
                                    {(scouting.tallestDefenders ?? []).map((player) => (
                                        <div key={player.playerId} className="stack-item">
                                            <strong><Link to={`/players/${player.playerId}`}>{player.playerName}</Link></strong>
                                            <small>{player.nationality} | {player.height}m</small>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4>Target forwards</h4>
                                <div className="stack-list compact-stack-list">
                                    {(scouting.targetForwards ?? []).map((player) => (
                                        <div key={player.playerId} className="stack-item">
                                            <strong><Link to={`/players/${player.playerId}`}>{player.playerName}</Link></strong>
                                            <small>{player.preferredFoot} foot | {player.height}m</small>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </article>
                </section>
            )}

            {activeTab === 'market' && (
                <section className="content-grid portal-focus-grid market-grid">
                    <article className="sub-panel leaderboard-panel revenue-leaderboard">
                        <div className="panel-head">
                            <div>
                                <p className="section-kicker">Boardroom</p>
                                <h4>Top Revenue Clubs</h4>
                            </div>
                        </div>
                        <div className="leaderboard-list">
                            {rankedBoardroom.map((club, index) => {
                                const revenue = Number(club.estimatedSeasonRevenue ?? 0);
                                const sponsorship = Number(club.sponsorshipRevenue ?? 0);
                                const revenueWidth = maxRevenue > 0 ? `${Math.max((revenue / maxRevenue) * 100, 8)}%` : '8%';
                                return (
                                    <div
                                        key={club.teamId}
                                        className={`leaderboard-row ${index === 0 ? 'leaderboard-top' : ''}`}
                                    >
                                        <div className="leaderboard-rank">#{index + 1}</div>
                                        <div className="leaderboard-body">
                                            <strong><Link to={`/teams/${club.teamId}`}>{club.teamName}</Link></strong>
                                            <small>Revenue: {formatMoney(club.estimatedSeasonRevenue)}</small>
                                            <small>Sponsor: {formatMoney(club.sponsorshipRevenue)}</small>
                                            <small>Position {club.leaguePosition ?? 'N/A'} | Points {club.leaguePoints ?? 0}</small>
                                            <div className="leaderboard-bar">
                                                <div className="leaderboard-bar-fill revenue-fill" style={{ width: revenueWidth }} />
                                            </div>
                                        </div>
                                        <div className="leaderboard-value">{formatMoney(revenue)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </article>
                    <article className="sub-panel leaderboard-panel roi-leaderboard">
                        <div className="panel-head">
                            <div>
                                <p className="section-kicker">Market</p>
                                <h4>Sponsor ROI Leaders</h4>
                            </div>
                        </div>
                        <div className="leaderboard-list">
                            {rankedSponsorRoi.map((row, index) => {
                                const roiScore = Number(row.roiScore ?? 0);
                                const roiWidth = maxRoi > 0 ? `${Math.max((roiScore / maxRoi) * 100, 8)}%` : '8%';
                                return (
                                    <div
                                        key={`${row.teamName}-${index}`}
                                        className={`leaderboard-row roi-row ${index === 0 ? 'leaderboard-top' : ''}`}
                                    >
                                        <div className="leaderboard-rank">#{index + 1}</div>
                                        <div className="leaderboard-body">
                                            <strong>{row.teamName}</strong>
                                            <small>{row.sponsorName} | Position {row.leaguePosition ?? 'N/A'}</small>
                                            <small>ROI {row.roiScore ?? 'N/A'} | Sponsorship {formatMoney(row.sponsorshipValue)}</small>
                                            <div className="leaderboard-bar">
                                                <div className="leaderboard-bar-fill roi-fill" style={{ width: roiWidth }} />
                                            </div>
                                        </div>
                                        <div className="leaderboard-value">{row.roiScore ?? 'N/A'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </article>
                </section>
            )}
        </div>
    );
};

export default Portals;
