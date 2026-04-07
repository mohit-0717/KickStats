import React from 'react';
import Icon from './Icon';
import { Icons } from '../../constants/icons';

const toneMap = {
    neutral: {
        className: 'empty-state-card neutral',
        icon: Icons.time
    },
    missing: {
        className: 'empty-state-card missing',
        icon: Icons.data
    },
    ai: {
        className: 'empty-state-card ai',
        icon: Icons.ai
    },
    search: {
        className: 'empty-state-card search',
        icon: Icons.search
    }
};

const EmptyState = ({
    tone = 'neutral',
    title,
    description,
    hint
}) => {
    const config = toneMap[tone] ?? toneMap.neutral;

    return (
        <div className={config.className}>
            <div className="empty-state-icon">
                <Icon icon={config.icon} size={18} />
            </div>
            <div className="empty-state-copy">
                <strong>{title}</strong>
                <p>{description}</p>
                {hint ? <small>{hint}</small> : null}
            </div>
        </div>
    );
};

export default EmptyState;
