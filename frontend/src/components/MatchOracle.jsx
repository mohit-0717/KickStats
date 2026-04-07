import React from 'react';
import AiPulseBadge from './AiPulseBadge';
import AnimatedStat from './AnimatedStat';
import EmptyState from './common/EmptyState';
import Icon from './common/Icon';
import { Icons } from '../constants/icons';

const bandClassMap = {
    HIGH_CONFIDENCE: 'oracle-band-high',
    VOLATILE: 'oracle-band-volatile',
    BALANCED: 'oracle-band-balanced'
};

const legendItems = [
    { key: 'HIGH_CONFIDENCE', label: 'Dominant', icon: Icons.goals, className: 'legend-high' },
    { key: 'BALANCED', label: 'Balanced', icon: Icons.stats, className: 'legend-balanced' },
    { key: 'VOLATILE', label: 'Volatile', icon: Icons.live, className: 'legend-volatile' }
];

const buildInsight = (oracle, comparison) => {
    const homeLambda = Number(oracle?.homeLambda ?? 0);
    const awayLambda = Number(oracle?.awayLambda ?? 0);
    const teams = Array.isArray(comparison) ? comparison : [];
    const home = teams[0];
    const away = teams[1];
    const possessionDelta = Number(home?.possession ?? 0) - Number(away?.possession ?? 0);

    if (awayLambda - homeLambda > 0.25) {
        return 'Away team projects stronger attacking efficiency, but the match shape still leaves room for volatility in transition.';
    }

    if (homeLambda - awayLambda > 0.25) {
        return 'Home side holds the cleaner scoring profile and should control the higher-quality phases if possession stays stable.';
    }

    if (Math.abs(possessionDelta) > 8) {
        return 'Possession leans one way, but the scoring outlook remains close enough to keep this tactically live deep into the match.';
    }

    return 'The model reads this as finely balanced, with neither side generating enough separation to fully control the narrative.';
};

const MatchOracle = ({ oracle, comparison = [], featuredTeams = [], layout = 'stacked' }) => {
    const isReady = oracle?.status === 'ready';
    const themeClass = bandClassMap[oracle?.confidenceBand] || bandClassMap.BALANCED;
    const isWide = layout === 'wide';

    if (!isReady) {
        return (
            <section className={`oracle-card oracle-band-balanced ${isWide ? 'oracle-card-wide' : ''}`}>
                <div className="oracle-head">
                    <div>
                        <AiPulseBadge label="Neural Forecast" />
                        <p>Win Probability</p>
                    </div>
                </div>
                <EmptyState
                    tone="ai"
                    title="AI insights unavailable"
                    description={oracle?.message || 'The AI engine is currently offline or insufficient data is available.'}
                    hint="The forecast will appear once recent match form is available for both teams."
                />
            </section>
        );
    }

    const homeWin = Number(oracle.homeWin ?? 0);
    const draw = Number(oracle.draw ?? 0);
    const awayWin = Number(oracle.awayWin ?? 0);
    const homeLambda = Number(oracle.homeLambda ?? 0);
    const awayLambda = Number(oracle.awayLambda ?? 0);
    const totalGoals = Number(oracle.totalExpectedGoals ?? 0);
    const confidenceScore = Math.round(Math.max(homeWin, awayWin, draw) * 100);
    const homeTeamName = featuredTeams[0]?.teamName || 'Home';
    const awayTeamName = featuredTeams[1]?.teamName || 'Away';
    const xgTotal = Math.max(homeLambda + awayLambda, 0.1);
    const possessionTilt = comparison.length >= 2
        ? `${Math.round(Number(comparison[0]?.possession ?? 0))}-${Math.round(Number(comparison[1]?.possession ?? 0))}`
        : 'Even';
    const attackIntensity = totalGoals >= 3.4 ? 'High' : totalGoals >= 2.4 ? 'Elevated' : 'Measured';
    const defensiveStrength = totalGoals <= 2.2 ? 'Stable' : totalGoals <= 3 ? 'Mixed' : 'Open';

    return (
        <section className={`oracle-card ${themeClass} ${isWide ? 'oracle-card-wide' : ''}`}>
            <div className="oracle-head">
                <div>
                    <AiPulseBadge label="Neural Forecast" />
                    <p>Match Intelligence</p>
                </div>
                <div className="oracle-pulse-dot" />
            </div>

            <div className="oracle-lambda-row">
                <span>Projected Total: {totalGoals.toFixed(1)}</span>
                <span>{oracle.confidenceBand?.replaceAll('_', ' ')}</span>
            </div>

            <div className="oracle-dashboard-layout">
                <div className="oracle-dashboard-block oracle-score-block-wide">
                    <div className="oracle-scoreline">
                        <span>AI Projects Score</span>
                        <strong>{oracle.projectedScore || 'TBD'}</strong>
                    </div>

                    <div className="oracle-bar-labels">
                        <span>{homeTeamName}</span>
                        <span>Draw</span>
                        <span>{awayTeamName}</span>
                    </div>

                    <div className="oracle-bar">
                        <div className="oracle-fill home-fill" style={{ width: `${homeWin * 100}%` }} />
                        <div className="oracle-fill draw-fill" style={{ width: `${draw * 100}%` }} />
                        <div className="oracle-fill away-fill" style={{ width: `${awayWin * 100}%` }} />
                    </div>

                    <div className="oracle-stats">
                        <AnimatedStat label="Home" value={homeWin * 100} colorClass="oracle-home-text" />
                        <AnimatedStat label="Draw" value={draw * 100} colorClass="oracle-draw-text" />
                        <AnimatedStat label="Away" value={awayWin * 100} colorClass="oracle-away-text" />
                    </div>
                </div>

                <div className="oracle-dashboard-block oracle-center-block">
                    <div className="oracle-intelligence-grid oracle-intelligence-shared">
                        <div className="oracle-confidence-card">
                            <span>AI Confidence</span>
                            <div className="oracle-confidence-ring">
                                <div
                                    className="oracle-confidence-ring-fill"
                                    style={{ '--oracle-confidence': `${confidenceScore}%` }}
                                />
                                <strong>{confidenceScore}%</strong>
                            </div>
                        </div>

                        <div className="oracle-xg-card">
                            <div className="oracle-xg-head">
                                <span>Expected Goals</span>
                                <strong>{homeLambda.toFixed(2)} - {awayLambda.toFixed(2)}</strong>
                            </div>
                            <div className="oracle-xg-bars">
                                <div className="oracle-xg-team">
                                    <small>{homeTeamName}</small>
                                    <div className="oracle-xg-track">
                                        <div className="oracle-xg-fill home-fill" style={{ width: `${(homeLambda / xgTotal) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="oracle-xg-team away">
                                    <small>{awayTeamName}</small>
                                    <div className="oracle-xg-track">
                                        <div className="oracle-xg-fill away-fill" style={{ width: `${(awayLambda / xgTotal) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="oracle-dashboard-block oracle-right-block">
                    <div className="oracle-insight-box">
                        <span>Key Insight</span>
                        <p>{buildInsight(oracle, comparison)}</p>
                    </div>

                    <div className="oracle-scenarios">
                        {legendItems.map((item) => (
                            <div
                                key={item.key}
                                className={`oracle-scenario-chip ${item.className} ${oracle.confidenceBand === item.key ? 'active' : ''}`}
                            >
                                <Icon icon={item.icon} size={14} />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="oracle-pattern-grid">
                        <div className="oracle-pattern-item">
                            <small>Possession Tilt</small>
                            <strong>{possessionTilt}</strong>
                        </div>
                        <div className="oracle-pattern-item">
                            <small>Attack Intensity</small>
                            <strong>{attackIntensity}</strong>
                        </div>
                        <div className="oracle-pattern-item">
                            <small>Defensive Shape</small>
                            <strong>{defensiveStrength}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div className="oracle-footnote">
                <small>{oracle.narrative}</small>
                <small>{oracle.message}</small>
                {oracle.goalAlert && <strong>{oracle.goalAlert}</strong>}
            </div>
        </section>
    );
};

export default MatchOracle;
