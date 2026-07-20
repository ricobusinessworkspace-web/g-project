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
    for (let i = 13; i >= 0; i--) {
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
      
      // If it's today (i===0), the user wants the graph to show 0 until the day is over
      if (i === 0) {
        myDayPoints = 0;
        oppDayPoints = 0;
      }

      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateValue: start,
        You: myDayPoints,
        [oppName]: oppDayPoints,
        myDebt: myDayDebt,
        oppDebt: oppDayDebt
      });
    }
    return data;
  }, [actionEntries, opponentActionEntries, now, oppName]);

  // Intraday Data
  const intradayData = useMemo(() => {
    const data = [];
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    data.push({
      time: '00:00',
      fullDate: '00:00',
      You: 5,
      [oppName]: 5
    });

    let myRunning = 5;
    let oppRunning = 5;

    const allToday = [...actionEntries, ...opponentActionEntries]
      .filter(a => a.timestamp >= start && !a.is_cancelled)
      .sort((a, b) => a.timestamp - b.timestamp);

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
  }, [actionEntries, opponentActionEntries, now, oppName, userId]);

  const chartDataToUse = chartMode === 'intraday' ? intradayData : dailyChartData;
  const xAxisKey = chartMode === 'intraday' ? 'time' : 'fullDate';

  // 2. Data Preparation: Top / Flop Rules (Last 14 days)
  const ruleStats = useMemo(() => {
    const counts: Record<string, { positive: number, negative: number, debt: number, totalUses: number }> = {};
    const fourteenDaysAgo = startOfToday - 13 * 86400000;
    
    const validActions = actionEntries.filter(a => a.timestamp >= fourteenDaysAgo && !a.is_cancelled);
    for (const a of validActions) {
      if (!counts[a.rule_id]) counts[a.rule_id] = { positive: 0, negative: 0, debt: 0, totalUses: 0 };
      counts[a.rule_id].totalUses += 1;
      if (a.points_applied > 0) counts[a.rule_id].positive += a.points_applied;
      if (a.points_applied < 0) counts[a.rule_id].negative += Math.abs(a.points_applied);
      if (a.debt_applied > 0) counts[a.rule_id].debt += a.debt_applied;
    }
    return counts;
  }, [actionEntries, startOfToday]);

  const topPositiveRule = useMemo(() => {
    let topId = null;
    let max = 0;
    Object.keys(ruleStats).forEach(id => {
      if (ruleStats[id].positive > max && id !== 'gm_1' && id !== 'mandatory_penalty') {
        max = ruleStats[id].positive;
        topId = id;
      }
    });
    return topId ? rules.find(r => r.id === topId) : null;
  }, [ruleStats, rules]);

  const topNegativeRule = useMemo(() => {
    let topId = null;
    let max = 0;
    Object.keys(ruleStats).forEach(id => {
      if (ruleStats[id].negative > max || ruleStats[id].debt < 0) {
        const score = ruleStats[id].negative + Math.abs(Math.min(ruleStats[id].debt, 0));
        if (score > max) {
          max = score;
          topId = id;
        }
      }
    });
    return topId ? rules.find(r => r.id === topId) : null;
  }, [ruleStats, rules]);

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
    
    const myDay = actionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled).map(a => ({...a, isMe: true}));
    const oppDay = opponentActionEntries.filter(a => a.timestamp >= start && a.timestamp < end && !a.is_cancelled).map(a => ({...a, isMe: false}));
    const combined = [...myDay, ...oppDay].sort((a, b) => b.timestamp - a.timestamp);
    
    if (combined.length === 0) return <div style={{ padding: '16px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>No activity</div>;
    
    return (
      <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {combined.map(entry => {
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
            <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: entry.isMe ? 'var(--accent-color)' : 'var(--text-secondary)' }}>{entry.isMe ? 'YOU' : oppName.substring(0, 2).toUpperCase()}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ruleName}</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: ptColor }}>
                {entry.points_applied !== 0 ? `${ptSign}${entry.points_applied}` : ''}
              </div>
            </div>
          );
        })}
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
              <Area type={chartMode === 'intraday' ? 'stepAfter' : 'monotone'} dataKey="You" stroke="#34C759" strokeWidth={3} fillOpacity={1} fill="url(#colorYou)" />
              <Area type={chartMode === 'intraday' ? 'stepAfter' : 'monotone'} dataKey={oppName} stroke="#0A84FF" strokeWidth={3} fillOpacity={1} fill="url(#colorOpp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Debt Chart */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '20px 10px', marginBottom: '30px' }}>
        <h3 style={{ marginLeft: '10px', marginBottom: '20px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Debt Activity</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={dailyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="fullDate" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
              <Bar dataKey="myDebt" name="You (Debt)" fill="#FF3B30" radius={[4, 4, 4, 4]} />
              <Bar dataKey="oppDebt" name={`${oppName} (Debt)`} fill="#FF9F0A" radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rule Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '16px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
            Top Negative Impact
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--error-color)' }}>
            {topPositiveRule ? topPositiveRule.name : 'None'}
          </div>
        </div>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '16px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
            Top Positive Impact
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-color)' }}>
            {topNegativeRule ? topNegativeRule.name : 'None'}
          </div>
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
