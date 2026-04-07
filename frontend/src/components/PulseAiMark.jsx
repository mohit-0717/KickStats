import React from 'react';

const PulseAiMark = ({ size = 'md', glow = false, animated = false, className = '' }) => {
    const classes = [
        'pulse-ai-mark',
        `pulse-ai-mark-${size}`,
        glow ? 'glow' : '',
        animated ? 'animated' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <span className={classes} aria-hidden="true">
            <span className="pulse-ai-core" />
            <span className="pulse-ai-ring pulse-ai-ring-outer" />
            <span className="pulse-ai-ring pulse-ai-ring-mid" />
            <span className="pulse-ai-ring pulse-ai-ring-inner" />
            <span className="pulse-ai-signal pulse-ai-signal-left" />
            <span className="pulse-ai-signal pulse-ai-signal-right" />
        </span>
    );
};

export default PulseAiMark;
