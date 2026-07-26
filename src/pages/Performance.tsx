import React, { useState, useMemo } from 'react';
import { useTrackerStore } from '../store/trackerStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

export default function Performance() {
  const { 
    myPoints, myTotalDebt, myUnpaidWeeklyDebt, myWeeklyDebt,
    opponentPoints, opponentTotalDebt, opponentUnpaidWeeklyDebt, opponentWeeklyDebt,
    opponentName, actionEntries, opponentActionEntries, rules, userId, opponentUserId, opponentLastWeeklyResetDate, lastWeeklyResetDate
  } = useTrackerStore();

  const oppName = opponentName || 'Mate';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const [chartMode, setChartMode] = useState<'intraday' | 'daily'>('daily');
  const [showOppDebtDropdown, setShowOppDebtDropdown] = useState(false);
  const [showMyWeeklyDebt, setShowMyWeeklyDebt] = useState(false);
  const [showMyTotalDebt, setShowMyTotalDebt] = useState(false);
  const [showOppTotalDebt, setShowOppTotalDebt] = useState(false);

  const isTotalDebtRule = (rule_id: string) => {
    if (rule_id === 'adj_total' || rule_id === 'ab_3') return true;
    const rule = rules.find(r => r.id === rule_id);
    return rule?.category === 'ABBAUEN';
  };

  const oppResetTimestamp = opponentLastWeeklyResetDate ? new Date(opponentLastWeeklyResetDate).getTime() : 0;
  const oppWeeklyDebtBreakdown = opponentActionEntries
    .filter(a => !a.is_cancelled && a.timestamp > oppResetTimestamp && a.debt_applied !== 0)
    .filter(a => a.rule_id !== 'weekly_reset' && a.rule_id !== 'adj_total' && a.rule_id !== 'late_fee')
    .filter(a => !isTotalDebtRule(a.rule_id))
    .sort((a, b) => b.timestamp - a.timestamp);

  const myResetTimestamp = lastWeeklyResetDate ? new Date(lastWeeklyResetDate).getTime() : 0;
  const myWeeklyDebtBreakdown = actionEntries
    .filter(a => !a.is_cancelled && a.timestamp > myResetTimestamp && a.debt_applied !== 0)
    .filter(a => a.rule_id !== 'weekly_reset' && a.rule_id !== 'adj_total' && a.rule_id !== 'late_fee')
    .filter(a => !isTotalDebtRule(a.rule_id))
    .sort((a, b) => b.timestamp - a.timestamp);

  const myTotalDebtBreakdown = actionEntries
    .filter(a => !a.is_cancelled && isTotalDebtRule(a.rule_id))
    .sort((a, b) => b.timestamp - a.timestamp);

  const oppTotalDebtBreakdown = opponentActionEntries
    .filter(a => !a.is_cancelled && isTotalDebtRule(a.rule_id))
    .sort((a, b) => b.timestamp - a.timestamp);

  // 1. Data Preparation: Daily Points (Last 14 Days)
  const dailyChartData = useMemo(() => {
    const data = [];
    
    // Find the earliest action timestamp to determine how far back to render
    let minTimestamp = startOfToday;
    const allActions = [...actionEntries, ...opponentActionEntries].filter(a => !a.is_cancelled);
    for (const a of allActions) {
      if (a.timestamp < minTimestamp) minTimestamp = a.timestamp;
    }
    
    // We render up to 14 days, but bounded by the earliest action
    const maxDays = 13;
    let daysToDisplay = Math.floor((startOfToday - minTimestamp) / 86400000);
    if (daysToDisplay > maxDays) daysToDisplay = maxDays;
    if (daysToDisplay < 0) daysToDisplay = 0;

    let currentMyPoints = myPoints;
    let currentOppPoints = opponentPoints;
    let currentMyDebt = myTotalDebt;
    let currentOppDebt = opponentTotalDebt;

    // Work backwards from today to build the end-of-day history
    for (let i = 0; i <= daysToDisplay; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = d.getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1).getTime();
      
      const myDayActions = actionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled);
      const oppDayActions = opponentActionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled);
      
      let myDayPoints = 5; 
      let myDayDebt = 0;
      for (const a of myDayActions) {
        if (a.rule_id && a.rule_id.startsWith('gm_')) {
          myDayPoints += Math.max(0, a.points_applied - 5);
        } else {
          myDayPoints += a.points_applied;
        }
        myDayDebt += a.debt_applied;
      }
      
      let oppDayPoints = 5;
      let oppDayDebt = 0;
      for (const a of oppDayActions) {
        if (a.rule_id && a.rule_id.startsWith('gm_')) {
          oppDayPoints += Math.max(0, a.points_applied - 5);
        } else {
          oppDayPoints += a.points_applied;
        }
        oppDayDebt += a.debt_applied;
      }

      data.unshift({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateValue: start,
        You: myDayPoints,
        [oppName]: oppDayPoints,
        myDebt: currentMyDebt,
        oppDebt: currentOppDebt,
        myDayEarned: myDayPoints,
        oppDayEarned: oppDayPoints
      });

      currentMyDebt -= myDayDebt;
      currentOppDebt -= oppDayDebt;
    }
    
    return data;
  }, [actionEntries, opponentActionEntries, now, oppName, myTotalDebt, opponentTotalDebt]);

  // Intraday Data
  const intradayData = useMemo(() => {
    const data = [];
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const allToday = [...actionEntries, ...opponentActionEntries]
      .filter(a => a.timestamp >= start && !a.is_cancelled)
      .sort((a, b) => a.timestamp - b.timestamp);

    let myTodayEarned = 0;
    let oppTodayEarned = 0;
    for (const a of allToday) {
      if (a.user_id === userId) myTodayEarned += a.points_applied;
      else oppTodayEarned += a.points_applied;
    }

    let myRunning = myPoints - myTodayEarned;
    let oppRunning = opponentPoints - oppTodayEarned;

    data.push({
      time: '00:00',
      fullDate: '00:00',
      You: myRunning,
      [oppName]: oppRunning
    });

    for (const a of allToday) {
      if (a.user_id === userId) myRunning += a.points_applied;
      else oppRunning += a.points_applied;

      const d = new Date(a.timestamp);
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      data.push({
        time: timeStr,
        fullDate: timeStr,
        You: myRunning,
        [oppName]: oppRunning
      });
    }

    const currentStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    data.push({
      time: currentStr,
      fullDate: currentStr,
      You: myRunning,
      [oppName]: oppRunning
    });

    return data;
  }, [actionEntries, opponentActionEntries, now, oppName, userId, myPoints, opponentPoints]);

  const weeklyDebtChartData = useMemo(() => {
    const data = [];
    const dCopy = new Date(now);
    const day = dCopy.getDay();
    const diff = dCopy.getDate() - day + (day === 0 ? -6 : 1);
    const recentMonday = new Date(dCopy.setDate(diff)).setHours(0, 0, 0, 0);

    let myRunningDebt = 0;
    let oppRunningDebt = 0;

    for (let i = 0; i < 7; i++) {
      const start = recentMonday + i * 86400000;
      const end = start + 86400000;
      const dObj = new Date(start);

      if (start > now.getTime()) {
        data.push({ fullDate: dObj.toLocaleDateString('en-US', { weekday: 'short' }) });
        continue;
      }

      const myDayActions = actionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && a.rule_id !== 'weekly_reset' && a.rule_id !== 'adj_total' && a.rule_id !== 'late_fee' && !isTotalDebtRule(a.rule_id));
      const oppDayActions = opponentActionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && a.rule_id !== 'weekly_reset' && a.rule_id !== 'adj_total' && a.rule_id !== 'late_fee' && !isTotalDebtRule(a.rule_id));

      for (const a of myDayActions) {
        if (a.debt_applied !== 0 || a.rule_id === 'adj_weekly') myRunningDebt += a.debt_applied;
      }
      for (const a of oppDayActions) {
        if (a.debt_applied !== 0 || a.rule_id === 'adj_weekly') oppRunningDebt += a.debt_applied;
      }

      data.push({
        fullDate: dObj.toLocaleDateString('en-US', { weekday: 'short' }),
        myDebt: myRunningDebt,
        oppDebt: oppRunningDebt
      });
    }
    return data;
  }, [actionEntries, opponentActionEntries, now]);

  const totalDebtChartData = useMemo(() => {
    const data = [];
    let daysToDisplay = 13; // 14 days total including today

    let currentMyDebt = myTotalDebt;
    let currentOppDebt = opponentTotalDebt;

    // Work backwards from today
    for (let i = 0; i <= daysToDisplay; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = d.getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1).getTime();
      
      const myDayActions = actionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && isTotalDebtRule(a.rule_id));
      const oppDayActions = opponentActionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && isTotalDebtRule(a.rule_id));
      
      let myDayDebt = 0;
      for (const a of myDayActions) myDayDebt += a.debt_applied;
      
      let oppDayDebt = 0;
      for (const a of oppDayActions) oppDayDebt += a.debt_applied;

      data.unshift({
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        myDebt: currentMyDebt,
        oppDebt: currentOppDebt
      });

      currentMyDebt -= myDayDebt;
      currentOppDebt -= oppDayDebt;
    }
    
    return data;
  }, [actionEntries, opponentActionEntries, now, myTotalDebt, opponentTotalDebt]);

  const chartDataToUse = chartMode === 'intraday' ? intradayData : dailyChartData;
  const xAxisKey = chartMode === 'intraday' ? 'time' : 'fullDate';



  // 3. Past Days History Component
  const [expandedDate, setExpandedDate] = useState<number | null>(null);
  
  const pastDays = useMemo(() => {
    const days = [];
    const dCopy = new Date(now);
    dCopy.setHours(0, 0, 0, 0);
    const dayOfWeek = dCopy.getDay();
    const diff = dCopy.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const recentMonday = new Date(dCopy.setDate(diff)).getTime();
    
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    for (let t = todayMidnight - 86400000; t >= recentMonday; t -= 86400000) {
      days.push(t);
    }
    return days;
  }, [now]);

  const renderHistoryFeed = (dateTimestamp: number) => {
    const start = dateTimestamp;
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), new Date(start).getDate() + 1).getTime();
    
    const sortActions = (actions: any[]) => {
      return actions.sort((a, b) => {
        const aIsGm = a.rule_id?.startsWith('gm_');
        const bIsGm = b.rule_id?.startsWith('gm_');
        if (aIsGm && !bIsGm) return -1;
        if (!aIsGm && bIsGm) return 1;
        return a.timestamp - b.timestamp;
      });
    };

    const myDay = sortActions(actionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && a.rule_id !== 'weekly_reset' && a.rule_id !== 'daily_debt_settlement'));
    const oppDay = sortActions(opponentActionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && a.rule_id !== 'weekly_reset' && a.rule_id !== 'daily_debt_settlement'));
    
    const dayData = dailyChartData.find((d: any) => d.dateValue === start);
    const myFinalPoints = dayData ? dayData.You : '-';
    const oppFinalPoints = dayData ? dayData[oppName] : '-';

    const renderActionList = (actions: any[]) => {
      if (actions.length === 0) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '8px 0' }}>No actions</div>;
      return actions.map(entry => {
        const rule = rules.find(r => r.id === entry.rule_id);
        let ruleName = rule ? rule.name : 'Unknown';
        if (entry.rule_id?.startsWith('penalty_') || entry.rule_id === 'mandatory_penalty') ruleName = 'Mandatory Penalty';
        if (entry.rule_id === 'daily_debt_settlement') ruleName = 'Daily Debt Added';
        if (entry.rule_id === 'late_fee') ruleName = 'Late Fee (Unpaid Debt)';
        if (entry.rule_id?.startsWith('gm_')) ruleName = 'GM';
        
        let ptColor = entry.points_applied > 0 ? 'var(--error-color)' : entry.points_applied < 0 ? 'var(--accent-color)' : 'var(--text-secondary)';
        let ptSign = entry.points_applied > 0 ? '+' : '';
        
        let displayValue = entry.points_applied !== 0 ? `${ptSign}${entry.points_applied}` : '';
        if (entry.points_applied === 0 && entry.debt_applied !== 0) {
            displayValue = `${entry.debt_applied > 0 ? '+' : ''}${entry.debt_applied}€`;
            ptColor = entry.debt_applied > 0 ? 'var(--error-color)' : 'var(--accent-color)';
        }
        
        return (
          <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>{ruleName}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: ptColor }}>
              {displayValue}
            </span>
          </div>
        );
      });
    };

    return (
      <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* You Column */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>You</div>
            <div style={{ flex: 1 }}>{renderActionList(myDay)}</div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>FINAL</span>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>{myFinalPoints}</span>
            </div>
          </div>

          {/* Opponent Column */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>{oppName}</div>
            <div style={{ flex: 1 }}>{renderActionList(oppDay)}</div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>FINAL</span>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>{oppFinalPoints}</span>
            </div>
          </div>
        </div>
        
        {/* Difference & Debt Footer */}
        {typeof myFinalPoints === 'number' && typeof oppFinalPoints === 'number' && (
          <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Difference</span>
              <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{Math.abs(Math.max(0, myFinalPoints) - Math.max(0, oppFinalPoints))} pts</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Debt Added</span>
              <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--error-color)' }}>
                {(() => {
                  const myDebt = actionEntries.find(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && a.rule_id === 'daily_debt_settlement');
                  const oppDebt = opponentActionEntries.find(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && a.rule_id === 'daily_debt_settlement');
                  if (myDebt) return `${myDebt.debt_applied}€ (You)`;
                  if (oppDebt) return `${oppDebt.debt_applied}€ (${oppName})`;
                  return '0€';
                })()}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(20,20,20,0.9)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px', fontWeight: 'bold' }}>{payload[0].payload.fullDate}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color || entry.fill }} />
              <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>{entry.name}: {entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderBreakdown = (entries: any[]) => {
    if (entries.length === 0) return <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No actions recorded.</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.map(entry => {
          const rule = rules.find(r => r.id === entry.rule_id);
          let name = rule ? rule.name : entry.rule_id;
          if (entry.rule_id === 'daily_debt_settlement') name = 'Daily Tax';
          if (entry.rule_id === 'adj_weekly') name = 'Adjustment';
          if (entry.rule_id === 'adj_total') name = 'Total Debt Adjust';
          if (entry.rule_id === 'ab_3') name = 'Schulden bezahlen';
          if (entry.rule_id?.startsWith('penalty_') || entry.rule_id === 'mandatory_penalty') name = 'Mandatory Penalty';
          
          const sign = entry.debt_applied > 0 ? '+' : '';
          const dayStr = new Date(entry.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
          return (
            <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{dayStr} - {name}</span>
              <span style={{ fontSize: '0.9rem', color: entry.debt_applied > 0 ? 'var(--error-color)' : 'var(--accent-color)', fontWeight: 'bold' }}>
                {sign}{entry.debt_applied}€
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeeklyBreakdown = (entries: any[]) => {
    const dates = [];
    const nowObj = new Date();
    nowObj.setHours(0,0,0,0);
    
    // Find most recent Monday
    const startObj = new Date(nowObj);
    const day = startObj.getDay();
    const diff = startObj.getDate() - day + (day === 0 ? -6 : 1);
    startObj.setDate(diff);
    
    for (let d = new Date(nowObj); d >= startObj; d.setDate(d.getDate() - 1)) {
      dates.push(new Date(d));
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {dates.map((dateObj, i) => {
          const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dayStart = dateObj.getTime();
          const dayEnd = dayStart + 86400000;
          
          const dayEntries = entries.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd);
          
          if (dayEntries.length === 0) {
            return (
              <div key={`empty-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{dateStr}</span>
                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.2)', fontWeight: 'bold' }}>-</span>
              </div>
            );
          }

          return dayEntries.map(entry => {
            const rule = rules.find(r => r.id === entry.rule_id);
            let name = rule ? rule.name : entry.rule_id;
            if (entry.rule_id === 'daily_debt_settlement') name = 'Daily Tax';
            if (entry.rule_id === 'adj_weekly') name = 'Adjustment';
            if (entry.rule_id === 'adj_total') name = 'Total Debt Adjust';
            if (entry.rule_id === 'ab_3') name = 'Schulden bezahlen';
            if (entry.rule_id?.startsWith('penalty_') || entry.rule_id === 'mandatory_penalty') name = 'Mandatory Penalty';
            
            const sign = entry.debt_applied > 0 ? '+' : '';
            return (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{dateStr} - {name}</span>
                <span style={{ fontSize: '0.9rem', color: entry.debt_applied > 0 ? 'var(--error-color)' : 'var(--accent-color)', fontWeight: 'bold' }}>
                  {sign}{entry.debt_applied}€
                </span>
              </div>
            );
          });
        })}
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <div className="section-title" style={{ marginTop: '20px', marginBottom: '20px' }}>Performance</div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
        
        {/* TOTAL DEBT CARD */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '16px' }}>
            <DollarSign size={16} /> Total Debt
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div onClick={() => setShowMyTotalDebt(!showMyTotalDebt)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: showMyTotalDebt ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>You</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--error-color)' }}>{myTotalDebt}€</span>
                {showMyTotalDebt ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
              </div>
            </div>
            <div onClick={() => setShowOppTotalDebt(!showOppTotalDebt)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: showOppTotalDebt ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{oppName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--error-color)' }}>{opponentTotalDebt}€</span>
                {showOppTotalDebt ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
              </div>
            </div>
          </div>
          {showMyTotalDebt && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Your Reductions</div>
              {renderBreakdown(myTotalDebtBreakdown)}
            </div>
          )}
          {showOppTotalDebt && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>{oppName}'s Reductions</div>
              {renderBreakdown(oppTotalDebtBreakdown)}
            </div>
          )}
        </div>

        {/* WEEKLY DEBT CARD */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '16px' }}>
            <TrendingDown size={16} /> Weekly Debt
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div onClick={() => setShowMyWeeklyDebt(!showMyWeeklyDebt)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: showMyWeeklyDebt ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>You</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--error-color)' }}>{myWeeklyDebt}€</span>
                {showMyWeeklyDebt ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
              </div>
            </div>
            <div onClick={() => setShowOppDebtDropdown(!showOppDebtDropdown)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: showOppDebtDropdown ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{oppName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--error-color)' }}>{opponentWeeklyDebt}€</span>
                {showOppDebtDropdown ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
              </div>
            </div>
          </div>
          {showMyWeeklyDebt && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>Your Weekly Entries</div>
              {renderWeeklyBreakdown(myWeeklyDebtBreakdown)}
            </div>
          )}
          {showOppDebtDropdown && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 'bold' }}>{oppName}'s Weekly Entries</div>
              {renderWeeklyBreakdown(oppWeeklyDebtBreakdown)}
            </div>
          )}
        </div>
      </div>

      {/* Points Chart */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '20px 10px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '10px', marginRight: '10px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>Points</h3>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
            <button 
              onClick={() => setChartMode('intraday')}
              style={{ background: chartMode === 'intraday' ? 'var(--accent-color)' : 'transparent', color: chartMode === 'intraday' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Today
            </button>
            <button 
              onClick={() => setChartMode('daily')}
              style={{ background: chartMode === 'daily' ? 'var(--accent-color)' : 'transparent', color: chartMode === 'daily' ? 'white' : 'var(--text-secondary)', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              14-Day
            </button>
          </div>
        </div>
        
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            {chartMode === 'intraday' ? (
              <AreaChart data={chartDataToUse} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorYou" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34C759" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOpp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0A84FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey={xAxisKey} stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} interval={chartMode === 'intraday' ? 'preserveStartEnd' : 0} angle={-45} textAnchor="end" height={40} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="You" stroke="#34C759" strokeWidth={3} fillOpacity={1} fill="url(#colorYou)" />
                <Area type="monotone" dataKey={oppName} stroke="#0A84FF" strokeWidth={3} fillOpacity={1} fill="url(#colorOpp)" />
              </AreaChart>
            ) : (
              <BarChart data={chartDataToUse} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey={xAxisKey} stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="You" fill="#34C759" radius={[4, 4, 0, 0]} />
                <Bar dataKey={oppName} fill="#0A84FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Debt Chart */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '20px 10px', marginBottom: '30px' }}>
        <h3 style={{ marginLeft: '10px', marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Debt Activity (This Week)</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={weeklyDebtChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMyDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOppDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9F0A" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FF9F0A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="fullDate" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="myDebt" name="You (Debt)" stroke="#FF3B30" strokeWidth={3} fillOpacity={1} fill="url(#colorMyDebt)" />
              <Area type="monotone" dataKey="oppDebt" name={`${oppName} (Debt)`} stroke="#FF9F0A" strokeWidth={3} fillOpacity={1} fill="url(#colorOppDebt)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Total Debt Chart */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '20px 10px', marginBottom: '30px' }}>
        <h3 style={{ marginLeft: '10px', marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Total Debt Activity (14 Days)</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={totalDebtChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMyTotalDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#BF5AF2" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#BF5AF2" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOppTotalDebt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64D2FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#64D2FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="fullDate" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="myDebt" name="You (Total Debt)" stroke="#BF5AF2" strokeWidth={3} fillOpacity={1} fill="url(#colorMyTotalDebt)" />
              <Area type="monotone" dataKey="oppDebt" name={`${oppName} (Total Debt)`} stroke="#64D2FF" strokeWidth={3} fillOpacity={1} fill="url(#colorOppTotalDebt)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>



      {/* Past Days History */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Past Days</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pastDays.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
              No past days available for the current week yet.
            </div>
          ) : (
            pastDays.map((ts) => {
              const dateObj = new Date(ts);
              const isExpanded = expandedDate === ts;
              return (
                <div key={ts} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div 
                    onClick={() => setExpandedDate(isExpanded ? null : ts)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', cursor: 'pointer' }}
                  >
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                  </div>
                  {isExpanded && renderHistoryFeed(ts)}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
