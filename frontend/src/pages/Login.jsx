import React, { useMemo, useState } from 'react';
import Icon from '../components/common/Icon';
import { Icons } from '../constants/icons';

const roleOptions = [
    { key: 'admin', title: 'Admin' },
    { key: 'analyst', title: 'Analyst' },
    { key: 'medical', title: 'Medical Staff' },
    { key: 'transfer', title: 'Transfer Manager' },
    { key: 'match-operator', title: 'Match Operator' },
    { key: 'fan', title: 'Fan' }
];

const roleLabels = {
    admin: 'Admin',
    analyst: 'Analyst',
    medical: 'Medical Staff',
    transfer: 'Transfer Manager',
    fan: 'Fan',
    'match-operator': 'Match Operator'
};

const Login = ({ onAuthenticate }) => {
    const [selectedRole, setSelectedRole] = useState('admin');
    const [authMode, setAuthMode] = useState('password');
    const [credentials, setCredentials] = useState({
        username: '',
        secret: ''
    });

    const selectedRoleLabel = useMemo(
        () => roleLabels[selectedRole] ?? 'User',
        [selectedRole]
    );

    const isFanAccess = selectedRole === 'fan';

    const handleSubmit = (event) => {
        event.preventDefault();
        if (isFanAccess) {
            onAuthenticate({ role: selectedRole, identity: 'fan' });
            return;
        }

        onAuthenticate({
            role: selectedRole,
            identity: credentials.username,
            authMode
        });
    };

    return (
        <div className="login-shell split-login-shell">
            <section className="login-panel split-login-panel">
                <div className="brand-panel">
                    <div className="brand-orb" aria-hidden="true" />
                    <p className="section-kicker">KickStats</p>
                    <h1 className="login-title">Smart Football Statistics Dashboard</h1>
                    <div className="brand-points">
                        <span><Icon icon={Icons.match} size={14} className="landing-meta-lucide" />Live match control</span>
                        <span><Icon icon={Icons.stats} size={14} className="landing-meta-lucide" />Player analytics</span>
                        <span><Icon icon={Icons.transfers} size={14} className="landing-meta-lucide" />Transfer intelligence</span>
                    </div>
                    <div className="mini-stats-grid login-preview-grid">
                        <div className="mini-stat-card">
                            <span>Product</span>
                            <strong>KickStats</strong>
                        </div>
                        <div className="mini-stat-card">
                            <span>Tagline</span>
                            <strong>Smart Football Statistics Dashboard</strong>
                        </div>
                        <div className="mini-stat-card wide">
                            <span>Entry Point</span>
                            <strong>Pick a role and enter the live football intelligence workspace.</strong>
                        </div>
                    </div>
                </div>

                <form className="login-auth-panel access-panel" onSubmit={handleSubmit}>
                    <div className="access-heading">
                        <p className="section-kicker">Access Portal</p>
                        <h3>{selectedRoleLabel}</h3>
                    </div>

                    <div className="chip-row">
                        <span>{selectedRoleLabel}</span>
                        <span>{isFanAccess ? 'Direct access' : authMode}</span>
                    </div>

                    <label className="login-field">
                        <span>Role</span>
                        <select
                            className="admin-input"
                            value={selectedRole}
                            onChange={(event) => setSelectedRole(event.target.value)}
                        >
                            {roleOptions.map((role) => (
                                <option key={role.key} value={role.key}>{role.title}</option>
                            ))}
                        </select>
                    </label>

                    {!isFanAccess && (
                        <>
                            <label className="login-field">
                                <span>Username / Email</span>
                                <input
                                    className="admin-input"
                                    type="text"
                                    placeholder="Enter username or email"
                                    value={credentials.username}
                                    onChange={(event) => setCredentials((current) => ({
                                        ...current,
                                        username: event.target.value
                                    }))}
                                    required
                                />
                            </label>

                            <div className="login-mode-row">
                                <span>Password / Passkey</span>
                                <div className="tab-row auth-tab-row">
                                    <button
                                        type="button"
                                        className={`tab-chip ${authMode === 'password' ? 'active' : ''}`}
                                        onClick={() => setAuthMode('password')}
                                    >
                                        Password
                                    </button>
                                    <button
                                        type="button"
                                        className={`tab-chip ${authMode === 'passkey' ? 'active' : ''}`}
                                        onClick={() => setAuthMode('passkey')}
                                    >
                                        Passkey
                                    </button>
                                </div>
                            </div>

                            <label className="login-field">
                                <span>{authMode === 'password' ? 'Password' : 'Passkey'}</span>
                                <input
                                    className="admin-input"
                                    type={authMode === 'password' ? 'password' : 'text'}
                                    placeholder={authMode === 'password' ? 'Enter password' : 'Enter passkey'}
                                    value={credentials.secret}
                                    onChange={(event) => setCredentials((current) => ({
                                        ...current,
                                        secret: event.target.value
                                    }))}
                                    required
                                />
                            </label>
                        </>
                    )}

                    <button className="admin-button login-submit" type="submit">
                        Continue
                    </button>

                    <p className="login-footnote">Fan access does not require authentication.</p>
                </form>
            </section>
        </div>
    );
};

export default Login;
