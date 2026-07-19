import React, { useState } from 'react';
import ActionCard from '../components/ActionCard';
import { useTrackerStore, getGmDate } from '../store/trackerStore';

export default function Dashboard() {
  const { 
    myPoints, myWeeklyDebt, opponentPoints, opponentName, rules, 
    logAction, logGm, lastGmDate, isLoading, opponentIsOnline,
    opponentLastSettlementDate, userName, actionEntries, opponentActionEntries, opponentLastGmDate
  } = useTrackerStore();

  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [testGmHour, setTestGmHour] = useState('6');
  const [testGmMinute, setTestGmMinute] = useState('00');
  const [showWelcome, setShowWelcome] = useState(true);

  const now = new Date();
  const todayStr = getGmDate(now);
  const needsGm = lastGmDate !== todayStr;

  const isOpponent = userName !== 'Rico' && userName !== null;
  const welcomeMessage = isOpponent ? 'Welcome Bitch Jigger' : 'Welcome Badman';

  if (isLoading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (needsGm) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
        <h2 style={{ color: 'white' }}>Set Wake Up Time (Test)</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            className="modal-input" 
            style={{ width: '100px' }} 
            value={testGmHour} 
            onChange={e => setTestGmHour(e.target.value)} 
            type="number" 
            placeholder="HH" 
          />
          <span style={{ fontSize: '40px', fontWeight: 'bold' }}>:</span>
          <input 
            className="modal-input" 
            style={{ width: '100px' }} 
            value={testGmMinute} 
            onChange={e => setTestGmMinute(e.target.value)} 
            type="number" 
            placeholder="MM" 
          />
        </div>
        <button 
          className="modal-btn modal-btn-primary" 
          style={{ width: '220px', background: 'white', color: 'black' }}
          onClick={() => {
            const d = new Date();
            d.setHours(parseInt(testGmHour, 10) || 0);
            d.setMinutes(parseInt(testGmMinute, 10) || 0);
            logGm(d);
          }}
        >
          Set GM
        </button>
        <p style={{ color: 'var(--text-secondary)' }}>Enter time and tap to calculate Sleep Tax.</p>
      </div>
    );
  }

  let currentSleepTax = 0;
  const currentHours = now.getHours();
  if (currentHours >= 5) currentSleepTax += 10;
  if (currentHours >= 6) currentSleepTax += 5;
  if (currentHours >= 7) currentSleepTax += 5;
  if (currentHours >= 8) currentSleepTax += 5;

  let displayOpponentPoints = 5;
  if (opponentLastSettlementDate === todayStr) {
    displayOpponentPoints = opponentPoints;
  }
  if (opponentLastGmDate !== todayStr) {
    displayOpponentPoints += currentSleepTax;
  }

  const diff = myPoints - displayOpponentPoints;
  const isWinning = diff <= 0; 
  const oppName = opponentName || 'Bitch Jigger';
  const diffText = diff === 0 
    ? `Tied with ${oppName}` 
    : `${Math.abs(diff)} point${Math.abs(diff) > 1 ? 's' : ''} ${isWinning ? 'better' : 'worse'} than ${oppName}`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const myTodayActions = actionEntries.filter(a => a.timestamp >= startOfDay && !a.is_cancelled).map(a => ({...a, isMe: true}));
  const oppTodayActions = opponentActionEntries.filter(a => a.timestamp >= startOfDay && !a.is_cancelled).map(a => ({...a, isMe: false}));
  const combinedHistory = [...myTodayActions, ...oppTodayActions].sort((a, b) => b.timestamp - a.timestamp);

  const handlePressAction = (rule: any) => {
    if (rule.requires_input) {
      setSelectedRule(rule);
      setInputValue('');
    } else {
      logAction(rule);
    }
  };

  const submitInput = () => {
    if (selectedRule) {
      const val = parseInt(inputValue, 10);
      if (!isNaN(val) && val > 0) {
        let multiplier = val;
        if (selectedRule.input_step) {
          multiplier = Math.ceil(val / selectedRule.input_step);
        }
        logAction(selectedRule, multiplier);
      }
      setSelectedRule(null);
    }
  };

  return (
    <div className="container">
      {/* Welcome Banner */}
      {showWelcome && (
        <div style={{ background: 'var(--brand-blue)', color: 'white', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
          <span>{welcomeMessage}</span>
          <button onClick={() => setShowWelcome(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>
      )}

      {/* Header / Main Score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', marginBottom: '60px' }}>
        <div className="section-title">Account</div>
        <div style={{ fontSize: '120px', fontWeight: '800', letterSpacing: '-4px', margin: '20px 0' }}>
          {myPoints}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card-bg)', padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--card-border)' }}>
          {opponentIsOnline && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', marginRight: '8px' }} />}
          <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{diffText}</span>
        </div>
        
        {myWeeklyDebt > 0 && (
          <div style={{ color: 'var(--error-color)', fontSize: '1.2rem', fontWeight: '700', marginTop: '16px' }}>
            {myWeeklyDebt}€ Weekly Debt
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ width: '100%', marginBottom: '40px' }}>
        <div className="section-title">QUICK ACTIONS</div>
        <div className="card-list" style={{ marginBottom: 0 }}>
          {rules.filter(r => r.category === 'REOCCURING' || r.category === 'ONCE_DAILY').map((rule) => (
            <ActionCard
              key={rule.id}
              rule={rule}
              onPress={() => handlePressAction(rule)}
            />
          ))}
        </div>
      </div>

      {/* History Feed */}
      <div style={{ width: '100%' }}>
        <div className="section-title">TODAY'S HISTORY</div>
        <div className="card-list">
          {combinedHistory.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No actions tracked today yet.</div>
          ) : (
            combinedHistory.map(entry => {
              const rule = rules.find(r => r.id === entry.rule_id);
              const ruleName = rule ? rule.name : (entry.rule_id.startsWith('penalty_') ? 'Mandatory Penalty' : 'GM / Unknown');
              const timeStr = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              return (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600', color: entry.isMe ? 'white' : 'var(--text-secondary)' }}>
                      {entry.isMe ? 'You' : oppName}: {ruleName}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{timeStr}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', color: entry.points_applied > 0 ? 'var(--error-color)' : 'var(--accent-color)' }}>
                    {entry.points_applied > 0 ? '+' : ''}{entry.points_applied} pts
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Input Modal */}
      {selectedRule && (
        <div className="modal-overlay" onClick={() => setSelectedRule(null)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Enter Value for {selectedRule.name}</h3>
            <input
              autoFocus
              className="modal-input"
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitInput()}
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setSelectedRule(null)}>Cancel</button>
              <button className="modal-btn modal-btn-primary" onClick={submitInput}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
