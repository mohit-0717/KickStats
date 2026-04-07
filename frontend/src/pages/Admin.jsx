import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import Icon from '../components/common/Icon';
import { Icons } from '../constants/icons';
import { usePulseData } from '../hooks/usePulseData';
import {
    createInjury,
    createTransfer,
    fetchAdminOptions,
    getErrorMessage,
    recordQuickGoal,
    updateFavouriteTeam,
    updateMatchStatus
} from '../services/api';

const initialForms = {
    status: { matchId: '', status: 'Live' },
    goal: { matchId: '', teamId: '', playerId: '', minute: '60' },
    injury: { playerId: '', type: '', returnDate: '' },
    transfer: { playerId: '', fromTeamId: '', toTeamId: '', transferFee: '', transferDate: '', contractLength: '' },
    preference: { userId: '', favTeamId: '' }
};

const roleConfig = {
    admin: {
        headline: 'Operate the full league state from one control surface.',
        modules: ['status', 'goal', 'injury', 'transfer', 'preference'],
        note: 'Admin can access every write module.'
    },
    'match-operator': {
        headline: 'Run live match operations without touching the rest of the system.',
        modules: ['status', 'goal'],
        note: 'Match Operator can update status and log quick goals.'
    },
    medical: {
        headline: 'Keep player availability accurate without exposing match or market controls.',
        modules: ['injury'],
        note: 'Medical Staff can only create injury updates.'
    },
    transfer: {
        headline: 'Manage transfer movement without access to medical or live match operations.',
        modules: ['transfer'],
        note: 'Transfer Manager can only create transfer records.'
    },
    fan: {
        headline: 'Tune the fan experience with preference updates only.',
        modules: ['preference'],
        note: 'Fans can only update favourite teams.'
    },
    analyst: {
        headline: 'Analysts stay read-only and use the dashboards without write controls.',
        modules: [],
        note: 'Analyst role has no write access.'
    }
};

const Admin = ({ currentRole }) => {
    const { data, refreshData } = usePulseData();
    const [options, setOptions] = useState(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submitting, setSubmitting] = useState('');
    const [forms, setForms] = useState(initialForms);
    const currentAccess = roleConfig[currentRole] ?? roleConfig.analyst;
    const availableMatches = options?.matches?.length ?? 0;
    const availablePlayers = options?.players?.length ?? 0;
    const availableTeams = options?.teams?.length ?? 0;

    useEffect(() => {
        let active = true;

        const loadOptions = async () => {
            setLoadingOptions(true);
            try {
                const response = await fetchAdminOptions();
                if (active) {
                    setOptions(response);
                }
            } catch (error) {
                if (active) {
                    toast.error(getErrorMessage(error, 'Failed to load admin options'));
                }
            } finally {
                if (active) {
                    setLoadingOptions(false);
                }
            }
        };

        void loadOptions();

        return () => {
            active = false;
        };
    }, []);

    const matchTeamsByMatch = useMemo(() => {
        const grouped = new Map();
        (options?.matchTeams ?? []).forEach((row) => {
            const list = grouped.get(String(row.matchId)) ?? [];
            list.push(row);
            grouped.set(String(row.matchId), list);
        });
        return grouped;
    }, [options]);

    const selectedGoalMatch = useMemo(
        () => (options?.matches ?? []).find((match) => String(match.matchId) === forms.goal.matchId),
        [options, forms.goal.matchId]
    );

    const quickGoalLocked = useMemo(() => {
        const status = selectedGoalMatch?.status?.toLowerCase?.();
        return status === 'completed' || status === 'finished';
    }, [selectedGoalMatch]);

    const canAccess = (moduleKey) => currentAccess.modules.includes(moduleKey);

    const handleChange = (section, field, value) => {
        setForms((current) => ({
            ...current,
            [section]: {
                ...current[section],
                [field]: value
            }
        }));
    };

    const runAction = async (key, action, resetSection) => {
        setSubmitting(key);
        try {
            await action();
            await Promise.all([refreshData(), fetchAdminOptions().then(setOptions)]);
            setForms((current) => ({
                ...current,
                [resetSection]: initialForms[resetSection]
            }));
        } catch (error) {
            toast.error(getErrorMessage(error, 'Admin action failed'));
        } finally {
            setSubmitting('');
        }
    };

    const submitStatus = async (event) => {
        event.preventDefault();
        await runAction(
            'status',
            async () => {
                await updateMatchStatus({
                    matchId: Number(forms.status.matchId),
                    status: forms.status.status
                });
                toast.success('Match status updated');
            },
            'status'
        );
    };

    const submitGoal = async (event) => {
        event.preventDefault();
        await runAction(
            'goal',
            async () => {
                await recordQuickGoal({
                    matchId: Number(forms.goal.matchId),
                    teamId: Number(forms.goal.teamId),
                    playerId: Number(forms.goal.playerId),
                    minute: Number(forms.goal.minute)
                });
                toast.success('Goal recorded and stats updated');
            },
            'goal'
        );
    };

    const submitInjury = async (event) => {
        event.preventDefault();
        await runAction(
            'injury',
            async () => {
                await createInjury({
                    playerId: Number(forms.injury.playerId),
                    type: forms.injury.type,
                    returnDate: forms.injury.returnDate
                });
                toast.success('Injury record created');
            },
            'injury'
        );
    };

    const submitTransfer = async (event) => {
        event.preventDefault();
        await runAction(
            'transfer',
            async () => {
                await createTransfer({
                    playerId: Number(forms.transfer.playerId),
                    fromTeamId: Number(forms.transfer.fromTeamId),
                    toTeamId: Number(forms.transfer.toTeamId),
                    transferFee: Number(forms.transfer.transferFee),
                    transferDate: forms.transfer.transferDate,
                    contractLength: Number(forms.transfer.contractLength)
                });
                toast.success('Transfer added to market feed');
            },
            'transfer'
        );
    };

    const submitPreference = async (event) => {
        event.preventDefault();
        await runAction(
            'preference',
            async () => {
                await updateFavouriteTeam({
                    userId: Number(forms.preference.userId),
                    favTeamId: Number(forms.preference.favTeamId)
                });
                toast.success('Fan preference updated');
            },
            'preference'
        );
    };

    return (
        <div className="page-shell">
            <section className="hero-panel admin-hero">
                <div className="hero-copy-block">
                    <p className="section-kicker">Operations Console</p>
                    <h2 className="hero-title">{currentAccess.headline}</h2>
                    <div className="player-identity-row">
                        <span><Icon icon={Icons.dashboard} size={14} className="landing-meta-lucide" />Role {currentRole}</span>
                        <span><Icon icon={Icons.match} size={14} className="landing-meta-lucide" />{currentAccess.modules.length || 0} active modules</span>
                        <span><Icon icon={Icons.ai} size={14} className="landing-meta-lucide" />Controlled access</span>
                    </div>
                    <div className="chip-row">
                        {currentAccess.modules.length ? currentAccess.modules.map((moduleKey) => (
                            <span key={moduleKey}>{moduleKey.replace('-', ' ')}</span>
                        )) : <span>Read-only surface</span>}
                    </div>
                </div>

                <article className="match-card admin-access-card">
                    <p className="section-kicker">Access Rule</p>
                    <div className="mini-stats-grid">
                        <div className="mini-stat-card">
                            <span>Matches</span>
                            <strong>{availableMatches}</strong>
                        </div>
                        <div className="mini-stat-card">
                            <span>Players</span>
                            <strong>{availablePlayers}</strong>
                        </div>
                        <div className="mini-stat-card">
                            <span>Teams</span>
                            <strong>{availableTeams}</strong>
                        </div>
                        <div className="mini-stat-card wide">
                            <span>Scope</span>
                            <strong>{currentAccess.note}</strong>
                        </div>
                    </div>
                </article>
            </section>

            {loadingOptions && <div className="empty-panel">Loading admin options...</div>}

            <section className="stats-row kpi-row admin-kpi-row">
                <article className="stat-card">
                    <span>Role</span>
                    <strong>{currentRole}</strong>
                    <small>Current operator profile in the console</small>
                </article>
                <article className="stat-card">
                    <span>Write Modules</span>
                    <strong>{currentAccess.modules.length || 0}</strong>
                    <small>Only the permitted control cards are visible</small>
                </article>
                <article className="stat-card">
                    <span>Data Surface</span>
                    <strong>{data ? 'Ready' : 'Offline'}</strong>
                    <small>Dashboard snapshot and admin options sync here</small>
                </article>
            </section>

            {currentRole === 'analyst' ? (
                <section className="panel analyst-panel">
                    <div className="panel-head">
                        <div>
                            <p className="section-kicker">Read-Only</p>
                            <h3>Analyst access only</h3>
                        </div>
                    </div>
                    <div className="mini-stats-grid">
                        <div className="mini-stat-card">
                            <span>Landing</span>
                            <strong>Global pulse</strong>
                        </div>
                        <div className="mini-stat-card">
                            <span>Match Center</span>
                            <strong>Live analysis</strong>
                        </div>
                        <div className="mini-stat-card">
                            <span>Portals</span>
                            <strong>Deep intelligence</strong>
                        </div>
                        <div className="mini-stat-card wide">
                            <span>Role rule</span>
                            <strong>Write actions are hidden for analysts.</strong>
                        </div>
                    </div>
                </section>
            ) : (
                <section className="admin-grid">
                    {canAccess('status') && (
                        <form className="panel admin-panel" onSubmit={submitStatus}>
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Match Controller</p>
                                    <h3>Update match status</h3>
                                </div>
                            </div>
                            <select className="admin-input" value={forms.status.matchId} onChange={(e) => handleChange('status', 'matchId', e.target.value)} required>
                                <option value="">Select match</option>
                                {(options?.matches ?? []).map((match) => (
                                    <option key={match.matchId} value={match.matchId}>
                                        Match {match.matchId} | {match.stage} | {match.status}
                                    </option>
                                ))}
                            </select>
                            <select className="admin-input" value={forms.status.status} onChange={(e) => handleChange('status', 'status', e.target.value)} required>
                                {(options?.statusOptions ?? []).map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                            <button className="admin-button" type="submit" disabled={submitting === 'status'}>Update Status</button>
                        </form>
                    )}

                    {canAccess('goal') && (
                        <form className="panel admin-panel" onSubmit={submitGoal}>
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Quick Action</p>
                                    <h3>Record goal</h3>
                                </div>
                            </div>
                            <select className="admin-input" value={forms.goal.matchId} onChange={(e) => {
                                const value = e.target.value;
                                handleChange('goal', 'matchId', value);
                                handleChange('goal', 'teamId', '');
                            }} required>
                                <option value="">Select match</option>
                                {(options?.matches ?? []).map((match) => (
                                    <option key={match.matchId} value={match.matchId}>
                                        Match {match.matchId} | {match.stage}
                                    </option>
                                ))}
                            </select>
                            <select className="admin-input" value={forms.goal.teamId} onChange={(e) => handleChange('goal', 'teamId', e.target.value)} required>
                                <option value="">Select scoring team</option>
                                {(matchTeamsByMatch.get(forms.goal.matchId) ?? []).map((team) => (
                                    <option key={`${team.matchId}-${team.teamId}`} value={team.teamId}>{team.teamName}</option>
                                ))}
                            </select>
                            <select className="admin-input" value={forms.goal.playerId} onChange={(e) => handleChange('goal', 'playerId', e.target.value)} required>
                                <option value="">Select player</option>
                                {(options?.players ?? []).map((player) => (
                                    <option key={player.playerId} value={player.playerId}>{player.playerName} | {player.position}</option>
                                ))}
                            </select>
                            <input className="admin-input" type="number" min="0" max="130" value={forms.goal.minute} onChange={(e) => handleChange('goal', 'minute', e.target.value)} required />
                            {quickGoalLocked && (
                                <p className="admin-hint">Quick Goal is locked because this match is already finished.</p>
                            )}
                            <button className="admin-button" type="submit" disabled={submitting === 'goal' || quickGoalLocked}>Record Goal</button>
                        </form>
                    )}

                    {canAccess('injury') && (
                        <form className="panel admin-panel" onSubmit={submitInjury}>
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Medical Wing</p>
                                    <h3>Create injury</h3>
                                </div>
                            </div>
                            <select className="admin-input" value={forms.injury.playerId} onChange={(e) => handleChange('injury', 'playerId', e.target.value)} required>
                                <option value="">Select player</option>
                                {(options?.players ?? []).map((player) => (
                                    <option key={player.playerId} value={player.playerId}>{player.playerName}</option>
                                ))}
                            </select>
                            <input className="admin-input" type="text" placeholder="Injury type" value={forms.injury.type} onChange={(e) => handleChange('injury', 'type', e.target.value)} required />
                            <input className="admin-input" type="date" value={forms.injury.returnDate} onChange={(e) => handleChange('injury', 'returnDate', e.target.value)} />
                            <button className="admin-button" type="submit" disabled={submitting === 'injury'}>Add Injury</button>
                        </form>
                    )}

                    {canAccess('transfer') && (
                        <form className="panel admin-panel" onSubmit={submitTransfer}>
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Market Manager</p>
                                    <h3>Create transfer</h3>
                                </div>
                            </div>
                            <select className="admin-input" value={forms.transfer.playerId} onChange={(e) => handleChange('transfer', 'playerId', e.target.value)} required>
                                <option value="">Select player</option>
                                {(options?.players ?? []).map((player) => (
                                    <option key={player.playerId} value={player.playerId}>{player.playerName}</option>
                                ))}
                            </select>
                            <select className="admin-input" value={forms.transfer.fromTeamId} onChange={(e) => handleChange('transfer', 'fromTeamId', e.target.value)} required>
                                <option value="">From team</option>
                                {(options?.teams ?? []).map((team) => (
                                    <option key={team.teamId} value={team.teamId}>{team.teamName}</option>
                                ))}
                            </select>
                            <select className="admin-input" value={forms.transfer.toTeamId} onChange={(e) => handleChange('transfer', 'toTeamId', e.target.value)} required>
                                <option value="">To team</option>
                                {(options?.teams ?? []).map((team) => (
                                    <option key={team.teamId} value={team.teamId}>{team.teamName}</option>
                                ))}
                            </select>
                            <input className="admin-input" type="number" min="0" placeholder="Transfer fee" value={forms.transfer.transferFee} onChange={(e) => handleChange('transfer', 'transferFee', e.target.value)} required />
                            <input className="admin-input" type="date" value={forms.transfer.transferDate} onChange={(e) => handleChange('transfer', 'transferDate', e.target.value)} required />
                            <input className="admin-input" type="number" min="1" placeholder="Contract length" value={forms.transfer.contractLength} onChange={(e) => handleChange('transfer', 'contractLength', e.target.value)} required />
                            <button className="admin-button" type="submit" disabled={submitting === 'transfer'}>Create Transfer</button>
                        </form>
                    )}

                    {canAccess('preference') && (
                        <form className="panel admin-panel" onSubmit={submitPreference}>
                            <div className="panel-head">
                                <div>
                                    <p className="section-kicker">Fan Preferences</p>
                                    <h3>Update favourite team</h3>
                                </div>
                            </div>
                            <select className="admin-input" value={forms.preference.userId} onChange={(e) => handleChange('preference', 'userId', e.target.value)} required>
                                <option value="">Select user</option>
                                {(options?.users ?? []).map((user) => (
                                    <option key={user.userId} value={user.userId}>{user.username}</option>
                                ))}
                            </select>
                            <select className="admin-input" value={forms.preference.favTeamId} onChange={(e) => handleChange('preference', 'favTeamId', e.target.value)} required>
                                <option value="">Select favourite team</option>
                                {(options?.teams ?? []).map((team) => (
                                    <option key={team.teamId} value={team.teamId}>{team.teamName}</option>
                                ))}
                            </select>
                            <button className="admin-button" type="submit" disabled={submitting === 'preference'}>Update Preference</button>
                        </form>
                    )}
                </section>
            )}

            <section className="panel">
                <div className="panel-head">
                    <div>
                        <p className="section-kicker">System Routing</p>
                        <h3>Current role flow</h3>
                    </div>
                </div>
                <div className="metric-list">
                    <span>Login page selects the role.</span>
                    <span>The selected role is saved locally and used for dashboard access.</span>
                    <span>Fan Cave modules change based on the active role.</span>
                    <span>Current dashboard snapshot loaded: {data ? 'Yes' : 'No'}</span>
                </div>
            </section>
        </div>
    );
};

export default Admin;
