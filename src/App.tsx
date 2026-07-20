import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Settings, BookOpen } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import RulesPage from './pages/Rules';
import { supabase } from './utils/supabase';
import { useTrackerStore } from './store/trackerStore';

function WelcomeSplash({ userName }: { userName: string | null }) {
  const [phase, setPhase] = useState<"text" | "logo" | "done">("text");

  useEffect(() => {
    const textTimer = setTimeout(() => setPhase("logo"), 1800);
    const logoTimer = setTimeout(() => setPhase("done"), 3000);
    return () => { clearTimeout(textTimer); clearTimeout(logoTimer); };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#000",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.6s ease-out",
      }}
    >
      {phase === "text" && (
        <div
          style={{
            position: "absolute",
            fontSize: "24px",
            fontWeight: 600,
            color: "#fff",
            animation: "textFadeInOut 1.8s ease-in-out forwards",
          }}
        >
          {userName ? `Welcome ${userName}` : "Welcome"}
        </div>
      )}

      {phase === "logo" && (
        <div
          style={{
            width: 100,
            height: 100,
            position: "relative",
            animation: "logoFadeInPulse 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards, ecosystemPulse 2s cubic-bezier(0.4, 0, 0.6, 1) 0.6s infinite",
            backgroundColor: "var(--brand-blue)",
            borderRadius: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontWeight: 900,
            color: "#fff"
          }}
        >
          G
        </div>
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { fetchState, fetchRules, setupRealtimeSync } = useTrackerStore();
  const [storedName] = useState(() => localStorage.getItem("gproject_user_name"));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
         localStorage.setItem("gproject_user_name", session.user.email.split('@')[0]);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
         localStorage.setItem("gproject_user_name", session.user.email.split('@')[0]);
      }
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

  const renderContent = () => {
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
  };

  return (
    <>
      <WelcomeSplash userName={storedName} />
      {renderContent()}
    </>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Account created! You can now sign in.');
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else if (data?.user?.email) {
        localStorage.setItem("gproject_user_name", data.user.email.split('@')[0]);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100vh', gap: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>G Project</h1>
      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          {loading ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Sign In')}
        </button>
      </form>
      <button 
        onClick={() => setIsRegistering(!isRegistering)} 
        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer', marginTop: '10px' }}
      >
        {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
    </div>
  );
}
