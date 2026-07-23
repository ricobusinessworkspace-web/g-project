import React, { useState, useMemo } from 'react';
import { useTrackerStore } from '../store/trackerStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

export default function Performance() {
  const { 
    myPoints, myTotalDebt, myUnpaidWeeklyDebt, myWeeklyDebt,
    opponentPoints, opponentTotalDebt, opponentUnpaidWeeklyDebt, opponentWeeklyDebt,
    opponentName, actionEntries, opponentActionEntries, rules, userId 
  } = useTrackerStore();

  const oppName = opponentName || 'Mate';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const [chartMode, setChartMode] = useState<'intraday' | 'daily'>('daily');

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
        myDayPoints += a.points_applied;
        myDayDebt += a.debt_applied;
      }
      
      let oppDayPoints = 5;
      let oppDayDebt = 0;
      for (const a of oppDayActions) {
        oppDayPoints += a.points_applied;
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

      const myDayActions = actionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && a.rule_id !== 'weekly_reset' && a.rule_id !== 'adj_total' && a.rule_id !== 'late_fee');
      const oppDayActions = opponentActionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled && a.rule_id !== 'weekly_reset' && a.rule_id !== 'adj_total' && a.rule_id !== 'late_fee');

      for (const a of myDayActions) {
        if (a.debt_applied > 0 || a.rule_id === 'adj_weekly') myRunningDebt += a.debt_applied;
      }
      for (const a of oppDayActions) {
        if (a.debt_applied > 0 || a.rule_id === 'adj_weekly') oppRunningDebt += a.debt_applied;
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



  // 3. Past Days History Component
  const [expandedDate, setExpandedDate] = useState<number | null>(null);
  
  const pastDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 7; i++) { // Show last 7 days history
      days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).getTime());
    }
    return days;
  }, [now]);

  const renderHistoryFeed = (dateTimestamp: number) => {
    const start = dateTimestamp;
    const end = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), new Date(start).getDate() + 1).getTime();
    
    const myDay = actionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled);
    const oppDay = opponentActionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled);
    
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
        if (entry.rule_id === 'weekly_reset') ruleName = 'Weekly Debt Reset';
        if (entry.rule_id === 'late_fee') ruleName = 'Late Fee (Unpaid Debt)';
        if (entry.rule_id?.startsWith('gm_')) ruleName = 'GM / Sleep Tax';
        
        let ptColor = entry.points_applied > 0 ? 'var(--error-color)' : entry.points_applied < 0 ? 'var(--accent-color)' : 'var(--text-secondary)';
        let ptSign = entry.points_applied > 0 ? '+' : '';
        
        return (
          <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>{ruleName}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: ptColor }}>
              {entry.points_applied !== 0 ? `${ptSign}${entry.points_applied}` : ''}
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

  return (
    <div className="container" style={{ paddingBottom: '100px' }}>
      <div className="section-title" style={{ marginTop: '20px', marginBottom: '20px' }}>Performance</div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '30px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px' }}>
            <DollarSign size={14} /> Total Debt
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--error-color)' }}>{myTotalDebt}€</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{oppName}: {opponentTotalDebt}€</div>
        </div>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '8px' }}>
            <TrendingDown size={14} /> Unpaid Weekly
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--error-color)' }}>{myUnpaidWeeklyDebt}€</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{oppName}: {opponentUnpaidWeeklyDebt}€</div>
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



      {/* Past Days History */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Past Days</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pastDays.map((ts) => {
            const dateObj = new Date(ts);
            const isExpanded = expandedDate === ts;
            return (
              <div key={ts} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', overflow: 'hidden' }}>
                <div 
                  onClick={() => setExpandedDate(isExpanded ? null : ts)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                </div>
                {isExpanded && renderHistoryFeed(ts)}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
