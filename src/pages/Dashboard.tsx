import React, { useState } from 'react';
import ActionCard from '../components/ActionCard';
import { useTrackerStore, getGmDate } from '../store/trackerStore';

export default function Dashboard() {
  const { 
    myPoints, myWeeklyDebt, opponentPoints, opponentName, rules, 
    logAction, logGm, lastGmDate, isLoading, opponentIsOnline,
    opponentLastSettlementDate
  } = useTrackerStore();

  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [testGmHour, setTestGmHour] = useState('6');
  const [testGmMinute, setTestGmMinute] = useState('00');

  const now = new Date();
  const todayStr = getGmDate(now);
  const needsGm = lastGmDate !== todayStr;

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

  const displayOpponentPoints = opponentLastSettlementDate === todayStr ? opponentPoints : 5;
  const diff = myPoints - displayOpponentPoints;
  const isWinning = diff <= 0; 
  const oppName = opponentName || 'Bitch Jigger';
  const diffText = diff === 0 
    ? `Tied with ${oppName}` 
    : `${Math.abs(diff)} point${Math.abs(diff) > 1 ? 's' : ''} ${isWinning ? 'better' : 'worse'} than ${oppName}`;

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
      {/* Header / Main Score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', marginBottom: '60px' }}>
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
      <div style={{ width: '100%' }}>
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
