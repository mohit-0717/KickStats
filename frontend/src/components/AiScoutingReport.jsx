import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './common/Icon';
import EmptyState from './common/EmptyState';
import { Icons } from '../constants/icons';

const AiScoutingReport = ({ report }) => {
    const twins = report?.twins ?? [];

    return (
        <section className="ai-report-card">
            <div className="ai-report-head">
                <div>
                    <h3>AI Analysis Engine</h3>
                    <p>Statistical Twins</p>
                </div>
                <div className="ai-live-pill">
                    <Icon icon={Icons.ai} size={13} />
                    <span>Scout Mode</span>
                </div>
            </div>

            {twins.length > 0 ? (
                <div className="ai-twin-list">
                    {twins.map((twin) => (
                        <article key={twin.playerId} className="ai-twin-row">
                            <div className="ai-twin-main">
                                <div>
                                    <strong><Link to={`/players/${twin.playerId}`}>{twin.playerName}</Link></strong>
                                    <span>{twin.position} | {twin.nationality}</span>
                                </div>
                                <div className="ai-score-block">
                                    <small>Scout Match</small>
                                    <strong>{(Number(twin.score ?? 0) * 100).toFixed(1)}%</strong>
                                </div>
                            </div>
                            <div className="ai-tag-row">
                                {(twin.explanations ?? []).map((label) => (
                                    <span key={label}>{label}</span>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyState
                    tone="ai"
                    title="AI insights unavailable"
                    description={report?.message || 'The AI engine is currently offline or insufficient data is available.'}
                    hint="Try again after the sidecar reconnects or when more player stats are indexed."
                />
            )}
        </section>
    );
};

export default AiScoutingReport;
