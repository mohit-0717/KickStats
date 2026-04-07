import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000
});

const unwrapResponse = (response) => response.data?.data ?? response.data;

export const getErrorMessage = (error, fallbackMessage) =>
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage;

export const fetchPulseDashboard = async () => {
    const response = await apiClient.get('/pulse/dashboard');
    return unwrapResponse(response);
};

export const fetchPortalPlayers = async ({ page = 0, size = 36, search = '' } = {}) => {
    const response = await apiClient.get('/pulse/portals/players', {
        params: {
            page,
            size,
            ...(search ? { search } : {})
        }
    });
    return unwrapResponse(response);
};

export const fetchPlayerDetail = async (playerId) => {
    const response = await apiClient.get(`/pulse/players/${playerId}`);
    return unwrapResponse(response);
};

export const fetchTeamDetail = async (teamId) => {
    const response = await apiClient.get(`/pulse/teams/${teamId}`);
    return unwrapResponse(response);
};

export const fetchMatchDetail = async (matchId) => {
    const response = await apiClient.get(`/pulse/matches/${matchId}`);
    return unwrapResponse(response);
};

export const fetchAdminOptions = async () => {
    const response = await apiClient.get('/admin/options');
    return unwrapResponse(response);
};

export const updateMatchStatus = async (payload) => {
    const response = await apiClient.put('/admin/matches/status', payload);
    return unwrapResponse(response);
};

export const recordQuickGoal = async (payload) => {
    const response = await apiClient.post('/admin/matches/quick-goal', payload);
    return unwrapResponse(response);
};

export const createInjury = async (payload) => {
    const response = await apiClient.post('/admin/injuries', payload);
    return unwrapResponse(response);
};

export const createTransfer = async (payload) => {
    const response = await apiClient.post('/admin/transfers', payload);
    return unwrapResponse(response);
};

export const updateFavouriteTeam = async (payload) => {
    const response = await apiClient.put('/admin/users/favourite-team', payload);
    return unwrapResponse(response);
};
