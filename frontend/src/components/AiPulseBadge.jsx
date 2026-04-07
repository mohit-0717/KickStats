import React from 'react';

const AiPulseBadge = ({ label = 'AI Insight', showGlow = true }) => {
    return (
        <span className={`ai-pulse-badge ${showGlow ? 'glow' : ''}`}>
            <span className="ai-pulse-icon" aria-hidden="true">✦</span>
            <span className="ai-pulse-label">{label}</span>
        </span>
    );
};

export default AiPulseBadge;
