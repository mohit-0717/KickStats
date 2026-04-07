import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/hero.css';

const Hero = ({
    title,
    subtitle,
    backgroundImage,
    cta,
    ctaLink = '/'
}) => {
    return (
        <section
            className="hero"
            style={{ backgroundImage: `url(${backgroundImage})` }}
        >
            <div className="hero-overlay"></div>
            <div className="hero-content">
                <h1 className="hero-title">{title}</h1>
                <p className="hero-subtitle">{subtitle}</p>
                {cta && (
                    <Link to={ctaLink} className="btn btn-primary btn-lg">
                        {cta}
                    </Link>
                )}
            </div>
        </section>
    );
};

export default Hero;
