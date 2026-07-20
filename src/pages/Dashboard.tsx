import React, { useState } from 'react';
import { Undo2 } from 'lucide-react';
import ActionCard from '../components/ActionCard';
import { useTrackerStore, getGmDate } from '../store/trackerStore';

export default function Dashboard() {
  const { 
    myPoints, myWeeklyDebt, opponentPoints, opponentName, rules, 
    logAction, undoAction, logGm, lastGmDate, isLoading, opponentIsOnline,
    opponentLastSettlementDate, userName, actionEntries, opponentActionEntries, opponentLastGmDate
  } = useTrackerStore();

  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [testGmHour, setTestGmHour] = useState('6');
  const [testGmMinute, setTestGmMinute] = useState('00');
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeDateOffset, setActiveDateOffset] = useState(0); // 0 = today, -1 = yesterday

  const now = new Date();
  const todayStr = getGmDate(now);
  const needsGm = lastGmDate !== todayStr;

  const isOpponent = userName !== 'Rico';
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
  const startOfSelectedDay = startOfDay + (activeDateOffset * 86400000);
  const endOfSelectedDay = startOfSelectedDay + 86400000;

  const myTodayActions = actionEntries.filter(a => a.timestamp >= startOfSelectedDay && a.timestamp < endOfSelectedDay).sort((a, b) => a.timestamp - b.timestamp);
  let myRunning = 5;
  const myActionsWithRunning = myTodayActions.map(a => {
    if (!a.is_cancelled && a.points_applied !== 0) myRunning += a.points_applied;
    return { ...a, isMe: true, runningPoints: myRunning };
  });

  const oppTodayActions = opponentActionEntries.filter(a => a.timestamp >= startOfSelectedDay && a.timestamp < endOfSelectedDay).sort((a, b) => a.timestamp - b.timestamp);
  let oppRunning = 5;
  const oppActionsWithRunning = oppTodayActions.map(a => {
    if (!a.is_cancelled && a.points_applied !== 0) oppRunning += a.points_applied;
    return { ...a, isMe: false, runningPoints: oppRunning };
  });

  const combinedHistory = [...myActionsWithRunning, ...oppActionsWithRunning].sort((a, b) => b.timestamp - a.timestamp);

  const daysArray = Array.from({length: 14}, (_, i) => -13 + i).reverse(); // 0 to -13
  const isTodayActive = activeDateOffset === 0;

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
          <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{diffText}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: opponentIsOnline ? '#34C759' : 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '12px', fontWeight: '600' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: opponentIsOnline ? '#34C759' : 'var(--text-secondary)' }} />
          {opponentIsOnline ? 'Mate is Online' : 'Mate is Offline'}
        </div>
        
        {myWeeklyDebt > 0 && (
          <div style={{ color: 'var(--error-color)', fontSize: '1.2rem', fontWeight: '700', marginTop: '16px' }}>
            {myWeeklyDebt}€ Weekly Debt
          </div>
        )}
      </div>


      {/* Date Ribbon */}
      <div style={{ width: '100%', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {daysArray.map(offset => {
            const dateObj = new Date(startOfDay + (offset * 86400000));
            const dayName = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dateNum = dateObj.getDate();
            const isActive = offset === activeDateOffset;
            
            return (
              <div 
                key={offset}
                onClick={() => setActiveDateOffset(offset)}
                style={{ 
                  flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '10px 16px', borderRadius: '20px', cursor: 'pointer',
                  background: isActive ? 'var(--accent-color)' : 'var(--card-bg)',
                  border: isActive ? 'none' : '1px solid var(--card-border)',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: isActive ? 0.9 : 0.6 }}>{dayName}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: isActive ? 'white' : 'var(--text-primary)' }}>{dateNum}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Feed */}
      <div style={{ width: '100%', marginBottom: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {combinedHistory.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--card-border)' }}>
              No actions tracked on this day.
            </div>
          ) : (
            combinedHistory.map(entry => {
              const rule = rules.find(r => r.id === entry.rule_id);
              let ruleName = rule ? rule.name : 'Unknown';
              if (entry.rule_id.startsWith('penalty_') || entry.rule_id === 'mandatory_penalty') ruleName = 'Mandatory Penalty';
              if (entry.rule_id === 'adj_weekly') ruleName = 'Weekly Debt Adjust';
              if (entry.rule_id === 'adj_total') ruleName = 'Total Debt Adjust';
              if (entry.rule_id === 'adj_points') ruleName = 'Points Adjust';
              if (entry.rule_id === 'late_fee') ruleName = 'Late Fee (Unpaid Debt)';
              if (entry.rule_id === 'weekly_reset') ruleName = 'Weekly Debt Reset';
              if (entry.rule_id.startsWith('gm_')) ruleName = 'GM / Sleep Tax';
              if (entry.rule_id === 'daily_debt_settlement') ruleName = 'Daily Debt Added';
              
              const timeStr = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              let ptColor = 'var(--text-secondary)';
              let ptBg = 'rgba(255,255,255,0.05)';
              let ptSign = '';
              if (entry.points_applied > 0) {
                ptColor = 'var(--error-color)';
                ptBg = 'rgba(255,69,58,0.15)';
                ptSign = '+';
              } else if (entry.points_applied < 0) {
                ptColor = 'var(--accent-color)';
                ptBg = 'rgba(52,199,89,0.15)';
              }

              let debtColor = 'var(--text-secondary)';
              let debtSign = '';
              if (entry.rule_id !== 'weekly_reset') {
                if (entry.debt_applied > 0) {
                  debtColor = 'var(--error-color)';
                  debtSign = '+';
                } else if (entry.debt_applied < 0) {
                  debtColor = 'var(--accent-color)';
                }
              }

              return (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--card-border)', opacity: entry.is_cancelled ? 0.4 : 1, transition: 'opacity 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: entry.is_cancelled ? 'line-through' : 'none' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: entry.isMe ? 'rgba(52,199,89,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: entry.isMe ? 'var(--accent-color)' : 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {entry.isMe ? 'YOU' : oppName.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {ruleName}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', opacity: 0.6 }}>
                          = {entry.runningPoints} pts
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{timeStr}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textDecoration: entry.is_cancelled ? 'line-through' : 'none' }}>
                      {(entry.points_applied !== 0 || entry.rule_id.startsWith('gm_')) && (
                        <div style={{ background: ptBg, color: ptColor, padding: '4px 10px', borderRadius: '12px', fontWeight: '800', fontSize: '0.9rem' }}>
                          {ptSign}{entry.points_applied} pts
                        </div>
                      )}
                      {(entry.debt_applied !== 0 || entry.rule_id === 'weekly_reset' || entry.rule_id === 'late_fee' || entry.rule_id === 'daily_debt_settlement') && (
                        <div style={{ color: debtColor, fontWeight: '800', fontSize: '0.85rem', marginTop: '4px' }}>
                          {debtSign}{entry.debt_applied}€
                        </div>
                      )}
                    </div>
                    {entry.isMe && !entry.is_cancelled && isTodayActive && (
                      <button 
                        onClick={() => undoAction(entry.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--error-color)', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                      >
                        <Undo2 size={20} />
                      </button>
                    )}
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
