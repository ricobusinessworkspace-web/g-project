import React from 'react';
import * as icons from 'lucide-react';
import { Rule, useTrackerStore, getRuleUsageStats } from '../store/trackerStore';

interface ActionCardProps {
  rule: Rule;
  onPress: () => void;
}

export default function ActionCard({ rule, onPress }: ActionCardProps) {
  const { actionEntries } = useTrackerStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (icons as any)[rule.iconName] || icons.Circle;
  const isPositiveForOpponent = rule.base_value > 0; // Positive points/debts are BAD for the user
  
  const displayValue = rule.impact_type === 'DEBT' 
    ? `${rule.base_value > 0 ? '+' : ''}${rule.base_value}€` 
    : `${rule.base_value > 0 ? '+' : ''}${rule.base_value}`;
  
  const stats = getRuleUsageStats(actionEntries, rule);
  
  let usageText = '';
  
  if (rule.daily_max) {
    usageText = `${stats.daily}/${rule.daily_max}`;
  } else if (rule.weekly_max) {
    usageText = `${stats.weekly}/${rule.weekly_max}`;
  } else if (rule.free_uses_per_week) {
    usageText = `${stats.weekly}/${rule.free_uses_per_week}`;
  }

  return (
    <div 
      className={`card-row glass`} 
      onClick={onPress} 
      style={{ 
        marginBottom: '12px', 
        cursor: 'pointer', 
        display: 'flex', 
        gap: '16px',
        opacity: 1
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <IconComponent color="#8E8E93" size={24} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="card-row-label">{rule.name}</span>
          {usageText && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{usageText} used</span>}
        </div>
      </div>
      <div style={{ 
        padding: '4px 8px', 
        fontWeight: '800',
        fontSize: '1.1rem',
        color: isPositiveForOpponent ? 'var(--error-color)' : 'var(--accent-color)'
      }}>
        {displayValue}
      </div>
    </div>
  );
}
