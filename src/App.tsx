import React from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';

export default function App() {
  const location = useLocation();

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>

      <nav className="bottom-nav">
        <NavLink 
          to="/" 
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
        >
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink 
          to="/settings" 
          className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          <Settings size={24} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </>
  );
}
