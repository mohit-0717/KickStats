import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import PulseAssistant from './components/PulseAssistant';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import MatchDetail from './pages/MatchDetail';
import PlayerList from './pages/PlayerList';
import PlayerDetail from './pages/PlayerDetail';
import TeamDetail from './pages/TeamDetail';
import './App.css';

const SESSION_KEY = 'football-pulse-session';

const ProtectedLayout = ({ currentRole, onLogout }) => (
    <div className="app-shell">
        <Navbar currentRole={currentRole} onLogout={onLogout} />
        <main className="app-content">
            <div className="app-routes">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/match-center" element={<Dashboard />} />
                    <Route path="/matches/:matchId" element={<MatchDetail />} />
                    <Route path="/portals" element={<PlayerList />} />
                    <Route path="/players/:playerId" element={<PlayerDetail />} />
                    <Route path="/teams/:teamId" element={<TeamDetail />} />
                    <Route path="/fan-cave" element={<Admin currentRole={currentRole} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
            <footer className="app-footer">
                <span>Copyright 2026 KickStats. All rights reserved.</span>
            </footer>
        </main>
        <PulseAssistant />
        <Toaster position="bottom-right" />
    </div>
);

function App() {
    const [currentRole, setCurrentRole] = useState(null);

    useEffect(() => {
        const savedSession = window.localStorage.getItem(SESSION_KEY);
        if (savedSession) {
            try {
                const parsedSession = JSON.parse(savedSession);
                if (parsedSession?.role) {
                    setCurrentRole(parsedSession.role);
                }
            } catch {
                window.localStorage.removeItem(SESSION_KEY);
            }
        }
    }, []);

    const handleAuthenticate = ({ role, identity = 'user', authMode = 'direct' }) => {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify({
            role,
            identity,
            authMode
        }));
        setCurrentRole(role);
    };

    const handleLogout = () => {
        window.localStorage.removeItem(SESSION_KEY);
        setCurrentRole(null);
    };

    return (
        <Router>
            {currentRole ? (
                <ProtectedLayout currentRole={currentRole} onLogout={handleLogout} />
            ) : (
                <Routes>
                    <Route path="/login" element={<Login onAuthenticate={handleAuthenticate} />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            )}
        </Router>
    );
}

export default App;
