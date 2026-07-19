import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Settings, BookOpen } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import RulesPage from './pages/Rules';
import { supabase } from './utils/supabase';
import { useTrackerStore } from './store/trackerStore';

export default function App() {
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { fetchState, fetchRules, setupRealtimeSync } = useTrackerStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      useTrackerStore.setState({ userId: session.user.id });
      fetchRules();
      fetchState(session.user.id);
      setupRealtimeSync(session.user.id);
    }
  }, [session]);

  if (authLoading) {
    return <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="loader"></div></div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <nav className="bottom-nav">
        <NavLink to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/rules" className={`nav-item ${location.pathname === '/rules' ? 'active' : ''}`}>
          <BookOpen size={24} />
          <span>Rules</span>
        </NavLink>
        <NavLink to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100vh', gap: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>G Project</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)}
          style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'white' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'white' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '16px', borderRadius: '12px', background: 'var(--brand-blue)', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
