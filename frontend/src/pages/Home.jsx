import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandWordmark from '../components/common/BrandWordmark';
import Icon from '../components/common/Icon';
import { Icons } from '../constants/icons';
import { usePulseData } from '../hooks/usePulseData';

const formatMoney = (value) => {
    if (value === null || value === undefined) {
        return 'TBD';
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);
};

const Chip = ({ icon, label }) => (
    <span className="landing-chip">
        <Icon icon={icon} size={16} className="landing-chip-lucide" />
        {label}
    </span>
);

const RollingNumber = ({ value, decimals = 0, prefix = '', suffix = '' }) => {
    const target = Number(value ?? 0);
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let frameId;
        let startTime;
        const duration = 1400;

        const step = (timestamp) => {
            if (startTime === undefined) {
                startTime = timestamp;
            }

            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(target * eased);

            if (progress < 1) {
                frameId = window.requestAnimationFrame(step);
            }
        };

        setDisplayValue(0);
        frameId = window.requestAnimationFrame(step);

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [target]);

    return (
        <>
            {prefix}
            {displayValue.toFixed(decimals)}
            {suffix}
        </>
    );
};

const StatPill = ({ icon, value, label }) => (
    <div className="landing-stat-pill">
        <Icon icon={icon} size={16} className="landing-stat-lucide" />
        <div className="landing-stat-pill-copy">
            <strong>{typeof value === 'number' ? <RollingNumber value={value} decimals={Number.isInteger(value) ? 0 : 2} /> : value}</strong>
            <small>{label}</small>
        </div>
    </div>
);

const getInitials = (name) => {
    return String(name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'PL';
};

const getScoutingSignal = (player) => {
    const height = Number(player?.height ?? 0);

    if (height >= 1.88) {
        return { label: 'Aerial Strength', value: 'Elite' };
    }

    if (height >= 1.8) {
        return { label: 'Physical Profile', value: 'Strong' };
    }

    return { label: 'Mobility Index', value: 'Sharp' };
};

const getFeaturedTeams = (featuredMatch) => {
    const teams = Array.isArray(featuredMatch?.teams) ? featuredMatch.teams : [];

    if (teams.length >= 2) {
        return {
            homeTeam: teams[0]?.teamName || 'Home',
            awayTeam: teams[1]?.teamName || 'Away'
        };
    }

    const label = String(featuredMatch?.matchLabel || '');
    const [homeTeam = 'Home', awayTeam = 'Away'] = label.split(' vs ');
    return { homeTeam, awayTeam };
};

const Home = () => {
    const { data, loading, error } = usePulseData();
    const [selectedCity, setSelectedCity] = useState(null);
    const [venueSearch, setVenueSearch] = useState('');

    const landing = data?.landing;
    const featuredMatch = landing?.featuredMatch;
    const trendingPlayer = landing?.trendingPlayer;
    const mapTeams = landing?.globalMapTeams ?? [];
    const latestTransfers = landing?.latestTransfers ?? [];
    const headlineStats = landing?.headlineStats ?? {};
    const spotlightScouts = landing?.spotlightScouts ?? [];

    const rankedTransfers = [...latestTransfers].sort((left, right) => {
        const leftFee = Number(left.transferFee ?? 0);
        const rightFee = Number(right.transferFee ?? 0);
        return rightFee - leftFee;
    });

    const maxTransferFee = rankedTransfers.reduce(
        (currentMax, transfer) => Math.max(currentMax, Number(transfer.transferFee ?? 0)),
        0
    );

    const filteredMapTeams = useMemo(() => {
        const query = venueSearch.trim().toLowerCase();
        if (!query) {
            return mapTeams;
        }

        return mapTeams.filter((team) => {
            const city = String(team.city || '').toLowerCase();
            const teamName = String(team.teamName || '').toLowerCase();
            const stadiumName = String(team.stadiumName || '').toLowerCase();
            return city.includes(query) || teamName.includes(query) || stadiumName.includes(query);
        });
    }, [mapTeams, venueSearch]);

    const activeCity = useMemo(() => {
        if (!filteredMapTeams.length) {
            return null;
        }

        const selectedStillVisible = selectedCity
            ? filteredMapTeams.find((team) => team.teamId === selectedCity.teamId)
            : null;

        return selectedStillVisible ?? filteredMapTeams[0];
    }, [filteredMapTeams, selectedCity]);

    const featuredTeams = useMemo(() => getFeaturedTeams(featuredMatch), [featuredMatch]);

    return (
        <div className="page-shell landing-dashboard-shell">
            <section className="landing-structure stadium-glow">
                <div className="landing-top-grid">
                    <div className="landing-top-copy">
                        <BrandWordmark as="p" className="landing-brand-mark">KickStats</BrandWordmark>
                        <p className="landing-tagline">Smart Football Statistics Dashboard</p>
                        <div className="landing-subtitle-row">
                            <Chip icon={Icons.matches} label="Matches" />
                            <Chip icon={Icons.transfers} label="Transfers" />
                            <Chip icon={Icons.stats} label="Stats" />
                            <Chip icon={Icons.ai} label="AI Insights" />
                        </div>
                    </div>

                    <div className="landing-top-actions">
                        <Link className="primary-action" to="/match-center">
                            <Icon icon={Icons.live} size={16} className="landing-action-icon" />
                            Live Match Center
                        </Link>
                        <Link className="secondary-action" to="/portals">
                            <Icon icon={Icons.explore} size={16} className="landing-action-icon" />
                            Explore Data
                        </Link>
                    </div>
                </div>

                {loading && <div className="empty-panel">Loading landing data...</div>}
                {error && <div className="empty-panel error-panel">{error}</div>}

                <div className="landing-bottom-grid">
                    <article className="match-card insight-card landing-focus-card featured-insight">
                        <p className="section-kicker">Pulse Hero</p>
                        {trendingPlayer ? (
                            <>
                                <div className="landing-player-hero">
                                    <div className="landing-player-main">
                                        <h3>
                                            <Link to={`/players/${trendingPlayer.playerId}`}>{trendingPlayer.playerName}</Link>
                                        </h3>
                                        <p>
                                            <Icon icon={Icons.stadium} size={14} className="landing-inline-lucide" />
                                            {trendingPlayer.nationality || 'Unknown'} • {trendingPlayer.position || 'Role N/A'}
                                        </p>
                                    </div>
                                    <div className="landing-flare-tag">Top performer</div>
                                </div>
                                <div className="landing-player-stats">
                                    <StatPill icon={Icons.goals} value={trendingPlayer.totalGoals ?? 0} label="Goals" />
                                    <StatPill icon={Icons.assists} value={trendingPlayer.totalAssists ?? 0} label="Assists" />
                                    <StatPill icon={Icons.rating} value={Number(trendingPlayer.pulseScore ?? 0)} label="Rating" />
                                </div>
                            </>
                        ) : (
                            <p>No trending player data available yet.</p>
                        )}
                    </article>

                    <article className="match-card insight-card landing-focus-card">
                        <p className="section-kicker">Match Of The Day</p>
                        {featuredMatch ? (
                            <>
                                <div className="landing-match-board">
                                    <div className="landing-match-team home">
                                        <span className="landing-team-dot" />
                                        <strong>{featuredTeams.homeTeam}</strong>
                                    </div>
                                    <div className="landing-score-block">
                                        <h3>
                                            <Link to={`/matches/${featuredMatch.matchId}`}>
                                                {featuredMatch.scoreline || 'TBD'}
                                            </Link>
                                        </h3>
                                    </div>
                                    <div className="landing-match-team away">
                                        <span className="landing-team-dot away" />
                                        <strong>{featuredTeams.awayTeam}</strong>
                                    </div>
                                </div>
                                <div className="landing-match-meta">
                                    <span>
                                        <Icon icon={Icons.stadium} size={14} className="landing-meta-lucide" />
                                        {featuredMatch.stadiumName || 'Unknown venue'}
                                    </span>
                                    <span>
                                        <Icon icon={Icons.time} size={14} className="landing-meta-lucide" />
                                        {featuredMatch.matchDate ? new Date(featuredMatch.matchDate).toLocaleString() : 'TBD'}
                                    </span>
                                    <span>
                                        <Icon icon={Icons.referee} size={14} className="landing-meta-lucide" />
                                        Ref: {featuredMatch.refereeName || 'TBD'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <p>No featured fixture is available.</p>
                        )}
                    </article>
                </div>
            </section>

            <section className="stats-row kpi-row">
                <article className="stat-card">
                    <span><Icon icon={Icons.match} size={15} className="landing-card-lucide" />Clubs</span>
                    <strong><RollingNumber value={headlineStats.totalTeams ?? 0} /></strong>
                    <small>Active club network</small>
                </article>
                <article className="stat-card">
                    <span><Icon icon={Icons.referee} size={15} className="landing-card-lucide" />Players</span>
                    <strong><RollingNumber value={headlineStats.totalPlayers ?? 0} /></strong>
                    <small>Active scouting pool</small>
                </article>
                <article className="stat-card">
                    <span><Icon icon={Icons.stadium} size={15} className="landing-card-lucide" />Stadiums</span>
                    <strong><RollingNumber value={headlineStats.totalStadiums ?? 0} /></strong>
                    <small>Venue coverage map</small>
                </article>
                <article className="stat-card">
                    <span><Icon icon={Icons.live} size={15} className="landing-card-lucide" />Matches</span>
                    <strong><RollingNumber value={headlineStats.totalMatches ?? 0} /></strong>
                    <small>Live pulse ready</small>
                </article>
            </section>

            <section className="content-grid landing-grid">
                <article className="panel venue-panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Global Map</p>
                            <h3>Venue pulse</h3>
                        </div>
                        <label className="landing-panel-search">
                            <input
                                type="text"
                                value={venueSearch}
                                onChange={(event) => setVenueSearch(event.target.value)}
                                placeholder="Search venue or club"
                                aria-label="Search venues"
                            />
                        </label>
                    </div>

                    <div className="venue-panel-body">
                        <div className="map-board">
                            {filteredMapTeams.map((team) => (
                                <button
                                    key={team.teamId}
                                    type="button"
                                    className={`map-node ${activeCity?.teamId === team.teamId ? 'active' : ''}`}
                                    onMouseEnter={() => setSelectedCity(team)}
                                    onFocus={() => setSelectedCity(team)}
                                    onClick={() => setSelectedCity(team)}
                                >
                                    <strong>{team.city}</strong>
                                    <span>{team.teamName}</span>
                                    <small>{team.stadiumPulse}</small>
                                </button>
                            ))}
                            {!filteredMapTeams.length && (
                                <div className="empty-panel compact">No venues match that search.</div>
                            )}
                        </div>

                        <div className="city-detail pulse-detail">
                            <div>
                                <h4>{activeCity?.city || 'No city selected'}</h4>
                                <p>{activeCity?.teamId ? <Link to={`/teams/${activeCity.teamId}`}>{activeCity.teamName}</Link> : 'No club available'}</p>
                                <p>Manager: {activeCity?.managerName || 'TBD'}</p>
                                <p>Stadium: {activeCity?.stadiumName || 'TBD'}</p>
                            </div>
                            <div className="mini-status-card">
                                <strong>{activeCity?.stadiumPulse || 'No pulse available'}</strong>
                                <span>{activeCity?.latestMatchStage || 'No stage linked'}</span>
                                <small>
                                    {activeCity?.latestMatchDate
                                        ? `Latest: ${new Date(activeCity.latestMatchDate).toLocaleString()}`
                                        : 'No recent match at this venue'}
                                </small>
                                {activeCity?.latestMatchId && (
                                    <Link to={`/matches/${activeCity.latestMatchId}`} className="inline-link">Open venue match</Link>
                                )}
                            </div>
                        </div>
                    </div>
                </article>

                <article className="panel transfer-panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Latest Transfers</p>
                            <h3>Transfer tape</h3>
                        </div>
                    </div>

                    <div className="leaderboard-list">
                        {rankedTransfers.map((transfer, index) => {
                            const transferFee = Number(transfer.transferFee ?? 0);
                            const feeWidth = maxTransferFee > 0 ? `${Math.max((transferFee / maxTransferFee) * 100, 8)}%` : '8%';
                            return (
                                <div
                                    key={transfer.transferId}
                                    className={`leaderboard-row compact-leaderboard-row ${index === 0 ? 'leaderboard-top' : ''}`}
                                >
                                    <div className="leaderboard-rank">#{index + 1}</div>
                                    <div className="leaderboard-body">
                                        <strong>
                                            <Link to={`/players/${transfer.playerId}`}>{transfer.playerName}</Link>
                                        </strong>
                                        <small>{transfer.fromTeam || 'Free Agent'} to {transfer.toTeam || 'Unknown Club'}</small>
                                        <small>{transfer.transferDate ? new Date(transfer.transferDate).toLocaleDateString() : 'No date'}</small>
                                        <div className="leaderboard-bar">
                                            <div className="leaderboard-bar-fill revenue-fill" style={{ width: feeWidth }} />
                                        </div>
                                    </div>
                                    <div className="leaderboard-value">{formatMoney(transfer.transferFee)}</div>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </section>

            <section className="panel scouting-panel">
                <div className="panel-head">
                    <div>
                        <p className="section-kicker">Physical Scouting</p>
                        <h3>Scouting shortcuts</h3>
                    </div>
                </div>

                <div className="card-grid three-up compact-card-grid">
                    {spotlightScouts.map((player) => (
                        <Link key={player.playerId} to={`/players/${player.playerId}`} className="player-spotlight scouting-player-card">
                            <div className="scouting-player-head">
                                <div className="scouting-player-avatar">{getInitials(player.playerName)}</div>
                                <div className="scouting-player-copy">
                                    <h4>{player.playerName}</h4>
                                    <p>{player.position} | {player.nationality}</p>
                                </div>
                            </div>
                            <div className="scouting-player-badges">
                                <span>{player.height}m</span>
                                <span>{player.preferredFoot}</span>
                            </div>
                            <div className="scouting-player-signal">
                                <small>{getScoutingSignal(player).label}</small>
                                <strong>{getScoutingSignal(player).value}</strong>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Home;
