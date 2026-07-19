import React from 'react';
import * as icons from 'lucide-react';
import { Rule } from '../store/trackerStore';

interface ActionCardProps {
  rule: Rule;
  onPress: () => void;
}

export default function ActionCard({ rule, onPress }: ActionCardProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (icons as any)[rule.iconName] || icons.Circle;
  const isPositiveForOpponent = rule.base_value > 0; // Positive points/debts are BAD for the user
  
  const displayValue = rule.impact_type === 'DEBT' 
    ? `${rule.base_value > 0 ? '+' : ''}${rule.base_value}€` 
    : `${rule.base_value > 0 ? '+' : ''}${rule.base_value}`;
  
  return (
    <div 
      className="card-row glass" 
      onClick={onPress} 
      style={{ marginBottom: '12px', cursor: 'pointer', display: 'flex', gap: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <IconComponent color="#8E8E93" size={24} />
        <span className="card-row-label">{rule.name}</span>
      </div>
      <div style={{ 
        backgroundColor: 'var(--card-border)', 
        padding: '6px 12px', 
        borderRadius: '8px',
        fontWeight: 'bold',
        color: isPositiveForOpponent ? 'var(--error-color)' : 'var(--accent-color)'
      }}>
        {displayValue}
      </div>
    </div>
  );
}
