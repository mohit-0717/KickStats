import { useCallback, useEffect, useState } from 'react';
import { fetchPulseDashboard, getErrorMessage } from '../services/api';

export const usePulseData = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetchPulseDashboard();
            setData(response);
            setError(null);
        } catch (requestError) {
            setError(getErrorMessage(requestError, 'Failed to load KickStats data'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refreshData();
    }, [refreshData]);

    return { data, loading, error, refreshData };
};
