import React, { useState, useMemo } from 'react';
import { useTrackerStore } from '../store/trackerStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { TrendingDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

export default function Performance() {
  const { 
    myPoints, myTotalDebt, myUnpaidWeeklyDebt, myWeeklyDebt,
    opponentPoints, opponentTotalDebt, opponentUnpaidWeeklyDebt, opponentWeeklyDebt,
    opponentName, actionEntries, opponentActionEntries, rules, opponentUserId, opponentLastWeeklyResetDate, lastWeeklyResetDate
  } = useTrackerStore();

  const oppName = opponentName || 'Mate';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const [chartMode, setChartMode] = useState<'intraday' | 'daily'>('daily');
  const [showOppDebtDropdown, setShowOppDebtDropdown] = useState(false);
  const [showMyWeeklyDebt, setShowMyWeeklyDebt] = useState(false);

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

  // Helper: find the most recent Monday at midnight
  const getRecentMonday = () => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.getTime();
  };

  // 1. Data Preparation: Daily Points (This Week: Monday through today)
  const dailyChartData = useMemo(() => {
    const data = [];
    const recentMonday = getRecentMonday();

    // Calculate how many days from Monday to today (inclusive)
    const daysFromMonday = Math.floor((startOfToday - recentMonday) / 86400000);

    let currentMyPoints = myPoints;
    let currentOppPoints = opponentPoints;
    let currentMyDebt = myTotalDebt;
    let currentOppDebt = opponentTotalDebt;

    // Work backwards from today to Monday to build the end-of-day history
    for (let i = 0; i <= daysFromMonday; i++) {
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
        fullDate: d.toLocaleDateString('en-US', { weekday: 'short' }),
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

    const myToday = actionEntries.filter(a => a.timestamp >= start && !a.is_cancelled).map(a => ({ ...a, isMine: true }));
    const oppToday = opponentActionEntries.filter(a => a.timestamp >= start && !a.is_cancelled).map(a => ({ ...a, isMine: false }));
    const allToday = [...myToday, ...oppToday].sort((a, b) => a.timestamp - b.timestamp);

    let myTodayEarned = 0;
    let oppTodayEarned = 0;
    for (const a of allToday) {
      if (a.isMine) myTodayEarned += a.points_applied;
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
      if (a.isMine) myRunning += a.points_applied;
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
  }, [actionEntries, opponentActionEntries, now, oppName, myPoints, opponentPoints]);

  const weeklyDebtChartData = useMemo(() => {
    const data = [];
    const recentMonday = getRecentMonday();

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

  const chartDataToUse = chartMode === 'intraday' ? intradayData : dailyChartData;
  const xAxisKey = chartMode === 'intraday' ? 'time' : 'fullDate';

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
            if (entry.rule_id === 'adj_points') name = 'Manual Points Edit';
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
        
        {/* TOTAL DEBT CARD - Compact, non-interactive */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '16px' }}>
            <DollarSign size={16} /> Total Debt
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>You</div>
              <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--error-color)' }}>{myTotalDebt}€</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{oppName}</div>
              <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--error-color)' }}>{opponentTotalDebt}€</span>
            </div>
          </div>
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
              Week
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
                <XAxis dataKey={xAxisKey} stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} interval={'preserveStartEnd'} angle={-45} textAnchor="end" height={40} />
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

      {/* Debt Activity Chart (This Week) */}
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

    </div>
  );
}
