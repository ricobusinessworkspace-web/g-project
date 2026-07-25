import React, { useState } from 'react';
import { useTrackerStore, getLogicalDate, getISODate } from '../store/trackerStore';
import { Pencil, ShieldCheck } from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function SettingsPage() {
  const { 
    isOnline, userId, myTotalDebt, myWeeklyDebt, myUnpaidWeeklyDebt, 
    opponentName, opponentUserId, opponentTotalDebt, opponentWeeklyDebt, opponentActionEntries, 
    opponentTripAbroad, opponentFamilyTrip, opponentSicko, opponentGoofFreeDayUsed,
    adjustDebt, settleWeeklyDebt,
    myTripAbroad, setTripAbroad,
    myFamilyTrip, setFamilyTrip,
    mySicko, setSicko,
    myGoofFreeDayUsed, setGoofFreeDay,
    userName, updateName, myPoints, adjustPoints,
    actionEntries, lastGmDate, updateGm, logGm
  } = useTrackerStore();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState<'WEEKLY' | 'TOTAL' | 'NAME' | 'POINTS'>('TOTAL');
  const [editValue, setEditValue] = useState('');
  const [localGmTime, setLocalGmTime] = useState<string | null>(null);
  const [isAdjustingGm, setIsAdjustingGm] = useState(false);

  const now = new Date();
  const currentSimDate = getLogicalDate(now);
  const todayGmAction = actionEntries.find(a => !a.is_cancelled && a.rule_id === 'gm_1' && getLogicalDate(new Date(a.timestamp)) === currentSimDate);
  const todayGmTimeStr = todayGmAction ? new Date(todayGmAction.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
  const displayGmTime = localGmTime !== null ? localGmTime : todayGmTimeStr;

  const openEditModal = (type: 'WEEKLY' | 'TOTAL' | 'NAME' | 'POINTS', currentValue: string | number) => {
    setEditType(type);
    setEditValue(currentValue?.toString() || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (editType === 'NAME') {
      updateName(editValue);
    } else if (editType === 'POINTS') {
      const val = parseInt(editValue, 10);
      if (!isNaN(val)) adjustPoints(val);
    } else {
      const val = parseInt(editValue, 10);
      if (!isNaN(val)) adjustDebt(editType, val);
    }
    setEditModalVisible(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const lastAction = opponentActionEntries.length > 0 
    ? [...opponentActionEntries].sort((a, b) => b.timestamp - a.timestamp)[0] 
    : null;
    
  let lastSeenText = 'Unknown';
  if (lastAction) {
    const d = new Date(lastAction.timestamp);
    lastSeenText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="container">
      {/* PROFILE & STATUS */}
      <div style={{ marginBottom: '32px' }}>
        <div className="section-title">PROFILE & STATUS</div>
        <div className="card-list">
          <div className="card-row">
            <span className="card-row-label">Connection Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#34C759' : '#FF453A' }} />
              <span className="card-row-value">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="card-row">
            <span className="card-row-label">Name</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--card-border)', padding: '4px 8px', borderRadius: '8px' }} onClick={() => openEditModal('NAME', userName || '')}>
              <span className="card-row-value">{userName || 'Not Set'}</span>
              <Pencil size={14} color="#8E8E93" />
            </div>
          </div>
          <div className="card-row">
            <span className="card-row-label">User ID</span>
            <span className="card-row-value" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userId || 'Not Logged In'}
            </span>
          </div>
        </div>
      </div>

      {/* EXEMPTIONS */}
      <div style={{ marginBottom: '32px' }}>
        <div className="section-title">EXEMPTIONS (EQUAL TAXATION)</div>
        <div className="card-list">
          <div className="card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="card-row-label">✈️ Trip Abroad (Goof Free)</span>
              <label className="switch">
                <input type="checkbox" checked={myTripAbroad} onChange={(e) => setTripAbroad(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            {opponentTripAbroad && <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: '500' }}>Active for {opponentName} (Equal Taxation applies)</span>}
          </div>
          
          <div className="card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="card-row-label">👨‍👩‍👧 Family Trip (No Sleep Rules)</span>
              <label className="switch">
                <input type="checkbox" checked={myFamilyTrip} onChange={(e) => setFamilyTrip(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            {opponentFamilyTrip && <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: '500' }}>Active for {opponentName} (Equal Taxation applies)</span>}
          </div>
          
          <div className="card-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="card-row-label">🤒 Sicko (Krank)</span>
              <label className="switch">
                <input type="checkbox" checked={mySicko} onChange={(e) => setSicko(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            {opponentSicko && <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: '500' }}>Active for {opponentName} (Equal Taxation applies)</span>}
          </div>
          <div className="card-row">
            <span className="card-row-label">🌴 Use Goof Free Day</span>
            <button 
              className="modal-btn" 
              style={{ 
                background: myGoofFreeDayUsed === getISODate(new Date()) ? 'var(--accent-color)' : 'var(--card-border)',
                padding: '8px 16px', flex: 'none', color: 'white',
                opacity: (myGoofFreeDayUsed && myGoofFreeDayUsed !== getISODate(new Date()) && myGoofFreeDayUsed.substring(0, 7) === getISODate(new Date()).substring(0, 7)) ? 0.5 : 1,
                cursor: (myGoofFreeDayUsed && myGoofFreeDayUsed !== getISODate(new Date()) && myGoofFreeDayUsed.substring(0, 7) === getISODate(new Date()).substring(0, 7)) ? 'not-allowed' : 'pointer'
              }}
              onClick={() => {
                const today = getISODate(new Date());
                const currentMonth = today.substring(0, 7);
                const usedMonth = myGoofFreeDayUsed ? myGoofFreeDayUsed.substring(0, 7) : null;
                const isUsedThisMonth = usedMonth === currentMonth && myGoofFreeDayUsed !== today;

                if (isUsedThisMonth) return;

                if (myGoofFreeDayUsed === today) {
                  setGoofFreeDay(null);
                } else {
                  setGoofFreeDay(today);
                }
              }}
            >
              {myGoofFreeDayUsed === getISODate(new Date())
                ? 'Active Today' 
                : (myGoofFreeDayUsed && myGoofFreeDayUsed.substring(0, 7) === getISODate(new Date()).substring(0, 7) 
                    ? 'Already Used This Month' 
                    : 'Activate for Today')}
            </button>
          </div>
        </div>
      </div>

      {/* HIDDEN STATS */}
      <div style={{ marginBottom: '32px' }}>
        <div className="section-title">HIDDEN STATS (YOU)</div>
        <div className="card-list">
          <div className="card-row">
            <span className="card-row-label">Total Points</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--card-border)', padding: '4px 8px', borderRadius: '8px' }} onClick={() => openEditModal('POINTS', myPoints)}>
              <span className="card-row-value-accent" style={{ color: 'white' }}>{myPoints} pts</span>
              <Pencil size={14} color="#8E8E93" />
            </div>
          </div>
          <div className="card-row">
            <span className="card-row-label">Total Accumulated Debt</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--card-border)', padding: '4px 8px', borderRadius: '8px' }} onClick={() => openEditModal('TOTAL', myTotalDebt)}>
              <span className="card-row-value-accent">{myTotalDebt}€</span>
              <Pencil size={14} color="#8E8E93" />
            </div>
          </div>
          <div className="card-row">
            <span className="card-row-label">Weekly Debt</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'var(--card-border)', padding: '4px 8px', borderRadius: '8px' }} onClick={() => openEditModal('WEEKLY', myWeeklyDebt)}>
              <span className="card-row-value-accent">{myWeeklyDebt}€</span>
              <Pencil size={14} color="#8E8E93" />
            </div>
          </div>
          {lastGmDate === currentSimDate && (
            <div className="card-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <span className="card-row-label">Today's GM Time</span>
                {!isAdjustingGm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="card-row-value">{todayGmTimeStr}</span>
                    <button 
                      onClick={() => setIsAdjustingGm(true)}
                      style={{ background: 'var(--primary-color)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      Anpassen
                    </button>
                  </div>
                ) : (
                  <input 
                    type="time" 
                    className="time-input"
                    style={{ 
                      background: 'var(--card-border)', 
                      color: 'white', 
                      padding: '6px 10px', 
                      borderRadius: '8px', 
                      border: 'none',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit'
                    }}
                    value={displayGmTime}
                    onChange={(e) => {
                      setLocalGmTime(e.target.value);
                    }}
                    onBlur={() => {
                      if (!localGmTime || localGmTime === todayGmTimeStr) {
                        setIsAdjustingGm(false);
                        return;
                      }
                      const [h, m] = localGmTime.split(':');
                      if (!h || !m) return;
                      
                      const newDate = new Date();
                      newDate.setHours(parseInt(h, 10));
                      newDate.setMinutes(parseInt(m, 10));
                      newDate.setSeconds(0);
                      newDate.setMilliseconds(0);
                      
                      if (newDate < new Date()) {
                        toast.error('GM-Zeit darf nicht in der Vergangenheit liegen!', { style: { borderRadius: '12px', background: '#333', color: '#fff' } });
                        setLocalGmTime(null);
                        setIsAdjustingGm(false);
                        return;
                      }

                      if (todayGmTimeStr) {
                        updateGm(newDate, currentSimDate);
                      } else {
                        logGm(newDate, currentSimDate);
                      }
                      
                      setLocalGmTime(null);
                      setIsAdjustingGm(false);
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {myUnpaidWeeklyDebt > 0 && (
          <div style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid var(--error-color)', borderRadius: '16px', padding: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: 'var(--error-color)', fontWeight: '600' }}>Unpaid + Late Pay</span>
              <span style={{ color: 'var(--error-color)', fontWeight: '800', fontSize: '1.4rem' }}>{myUnpaidWeeklyDebt}€</span>
            </div>
            <button 
              style={{ width: '100%', padding: '14px', background: 'var(--error-color)', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              onClick={() => settleWeeklyDebt()}
            >
              I Have Paid This In Real Life
            </button>
          </div>
        )}
      </div>

      {/* OPPONENT PROFILE */}
      <div style={{ marginBottom: '32px' }}>
        <div className="section-title">OPPONENT PROFILE</div>
        <div className="card-list">
          <div className="card-row">
            <span className="card-row-label">Name</span>
            <span className="card-row-value">{opponentName || 'Opponent'}</span>
          </div>
          <div className="card-row">
            <span className="card-row-label">User ID</span>
            <span className="card-row-value" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {opponentUserId || 'Unknown'}
            </span>
          </div>
          <div className="card-row">
            <span className="card-row-label">Total Debt</span>
            <span className="card-row-value-accent">{opponentTotalDebt}€</span>
          </div>
          <div className="card-row">
            <span className="card-row-label">Weekly Debt</span>
            <span className="card-row-value-accent">{opponentWeeklyDebt}€</span>
          </div>
          <div className="card-row">
            <span className="card-row-label">Last Seen (Action)</span>
            <span className="card-row-value">{lastSeenText}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '80px' }}>
        <button 
          style={{ width: '100%', padding: '16px', background: 'transparent', color: 'var(--error-color)', borderRadius: '12px', border: '1px solid var(--error-color)', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>

      {/* Edit Modal */}
      {editModalVisible && (
        <div className="modal-overlay" onClick={() => setEditModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">
              Adjust {editType === 'WEEKLY' ? 'Weekly Debt' : editType === 'TOTAL' ? 'Total Debt' : editType === 'POINTS' ? 'Total Points' : 'Name'}
            </h3>
            <input
              autoFocus
              className="modal-input"
              type={editType === 'NAME' ? 'text' : 'number'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
            <div className="modal-actions">
              <button className="modal-btn modal-btn-cancel" onClick={() => setEditModalVisible(false)}>Cancel</button>
              <button className="modal-btn modal-btn-primary" onClick={handleSaveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
