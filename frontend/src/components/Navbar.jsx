import React from 'react';
import { NavLink } from 'react-router-dom';
import PulseAiMark from './PulseAiMark';
import Icon from './common/Icon';
import { Icons } from '../constants/icons';

const mainLinks = [
    { path: '/', label: 'Home Surface', shortLabel: 'Landing', icon: Icons.home },
    { path: '/match-center', label: 'Live Pulse', shortLabel: 'Match Center', icon: Icons.match },
    { path: '/portals', label: 'Deep Dive', shortLabel: 'Portals', icon: Icons.portals },
    { path: '/fan-cave', label: 'Control Room', shortLabel: 'Dashboard', icon: Icons.dashboard }
];

const roleLabels = {
    admin: 'Admin',
    analyst: 'Analyst',
    medical: 'Medical Staff',
    transfer: 'Transfer Manager',
    fan: 'Fan',
    'match-operator': 'Match Operator'
};

const Navbar = ({ currentRole, onLogout }) => {
    const handleOpenPulse = () => {
        window.dispatchEvent(new CustomEvent('pulse-assistant:open'));
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <h1>KickStats</h1>
                <p className="sidebar-copy">Smart Football Statistics Dashboard</p>
            </div>

            <nav className="sidebar-nav" aria-label="Primary">
                <div className="sidebar-nav-group">
                    <p className="sidebar-group-title">Main</p>
                    {mainLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            end={link.path === '/'}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <span><Icon icon={link.icon} size={18} className="sidebar-link-lucide" />{link.shortLabel}</span>
                            <small>{link.label}</small>
                        </NavLink>
                    ))}
                </div>

                <div className="sidebar-nav-divider" />

                <div className="sidebar-nav-group">
                    <p className="sidebar-group-title">Tools</p>
                    <button type="button" className="sidebar-ai-link" onClick={handleOpenPulse}>
                        <PulseAiMark size="sm" glow animated />
                        <div className="sidebar-ai-copy">
                            <span>Pulse AI</span>
                            <small>Smart Assistant</small>
                        </div>
                    </button>

                </div>
            </nav>

            <div className="sidebar-session">
                <span className="sidebar-role-label"><Icon icon={Icons.referee} size={16} className="sidebar-link-lucide" />{roleLabels[currentRole] || 'Guest'}</span>
                <button type="button" className="sidebar-logout" onClick={onLogout}>Switch Role</button>
            </div>

            <div className="sidebar-footer">
                <p className="sidebar-note">Built on the football database.</p>
            </div>
        </aside>
    );
};

export default Navbar;
