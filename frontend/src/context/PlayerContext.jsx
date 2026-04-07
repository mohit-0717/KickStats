import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import * as api from '../services/api';
import { PlayerContext } from './player-context';

export const PlayerProvider = ({ children }) => {
    const [players, setPlayers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getUserFacingError = (requestError, fallbackMessage) => {
        const status = requestError?.response?.status;

        if (status === 401) {
            return 'Backend rejected the request with 401 Unauthorized';
        }

        return api.getErrorMessage(requestError, fallbackMessage);
    };

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const [playerData, dashboardStats] = await Promise.all([
                api.fetchPlayers(0, 100),
                api.fetchDashboardStats()
            ]);

            setPlayers(playerData.content || []);
            setStats(dashboardStats);
            setError(null);
        } catch (err) {
            const message = getUserFacingError(err, 'Failed to sync with backend');
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const addPlayer = async (formData) => {
        try {
            await api.createPlayer(formData);
            toast.success('Player added successfully');
            await refreshData();
            return true;
        } catch (err) {
            toast.error(getUserFacingError(err, 'Failed to add player'));
            return false;
        }
    };

    const removePlayer = async (id) => {
        try {
            await api.deletePlayer(id);
            toast.success('Player removed');
            await refreshData();
            return true;
        } catch (err) {
            toast.error(getUserFacingError(err, 'Delete failed'));
            return false;
        }
    };

    return (
        <PlayerContext.Provider
            value={{
                players,
                stats,
                loading,
                error,
                addPlayer,
                removePlayer,
                refreshData
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
};
