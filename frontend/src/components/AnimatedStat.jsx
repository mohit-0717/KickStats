import React, { useEffect, useState } from 'react';

const AnimatedStat = ({ value, label, colorClass }) => {
    const target = Math.round(Number(value ?? 0));
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let frameId;
        let startTime;
        const duration = 1500;

        const step = (timestamp) => {
            if (startTime === undefined) {
                startTime = timestamp;
            }

            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.round(target * eased));

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
        <div className="oracle-stat-item">
            <span>{label}</span>
            <strong className={colorClass}>{displayValue}%</strong>
        </div>
    );
};

export default AnimatedStat;
