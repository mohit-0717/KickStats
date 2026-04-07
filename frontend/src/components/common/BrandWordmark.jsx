import React, { useEffect, useRef, useState } from 'react';

const KICK_PATHS = [
    { hitX: '230px', hitY: '122px', outX: '860px', outY: '-32px' },
    { hitX: '300px', hitY: '118px', outX: '910px', outY: '-44px' },
    { hitX: '380px', hitY: '124px', outX: '970px', outY: '-38px' },
    { hitX: '460px', hitY: '120px', outX: '1030px', outY: '-50px' },
    { hitX: '540px', hitY: '126px', outX: '1085px', outY: '-42px' },
    { hitX: '620px', hitY: '121px', outX: '1130px', outY: '-54px' },
    { hitX: '700px', hitY: '125px', outX: '1180px', outY: '-46px' }
];

const BrandWordmark = ({ as: Tag = 'span', className = '', children }) => {
    const [ballToken, setBallToken] = useState(0);
    const [isKickActive, setIsKickActive] = useState(false);
    const [kickAngle, setKickAngle] = useState(0);
    const [kickVariant, setKickVariant] = useState(0);
    const [kickPath, setKickPath] = useState({
        hitX: '250px',
        hitY: '124px',
        outX: '940px',
        outY: '-30px'
    });
    const timeoutRef = useRef(null);
    const targetRef = useRef(0);

    const triggerBurst = () => {
        const randomAngle = Math.round((Math.random() * 20) - 10);
        const targetIndex = targetRef.current % KICK_PATHS.length;
        targetRef.current += 1;
        setKickVariant(targetIndex);
        setKickPath(KICK_PATHS[targetIndex]);

        setKickAngle(randomAngle);
        setBallToken((current) => current + 1);
        setIsKickActive(true);

        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
            setIsKickActive(false);
        }, 3000);
    };

    useEffect(() => () => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
    }, []);

    return (
        <Tag
            className={`brand-wordmark logo-container kick-variant-${kickVariant + 1} ${isKickActive ? 'kick-active' : ''} ${className}`.trim()}
            onMouseEnter={triggerBurst}
            onClick={triggerBurst}
            style={{
                '--kick-angle': `${kickAngle}deg`,
                '--kick-hit-x': kickPath.hitX,
                '--kick-hit-y': kickPath.hitY,
                '--kick-out-x': kickPath.outX,
                '--kick-out-y': kickPath.outY
            }}
        >
            <span className="logo-text">{children}</span>
            <span key={ballToken} className="ball" aria-hidden="true" />
        </Tag>
    );
};

export default BrandWordmark;
