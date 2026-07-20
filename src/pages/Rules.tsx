import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ActionCard from '../components/ActionCard';
import { useTrackerStore } from '../store/trackerStore';

export default function RulesPage() {
  const { rules, logAction } = useTrackerStore();
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');

  const displayRules = rules.filter(r => r.category !== 'GM' || r.id === 'gm_4');
  const orderedCategories = ['REOCCURING', 'ONCE_DAILY', 'EXERCISE', 'RECREATIONAL', 'BUSINESS', 'ABBAUEN', 'GN'];
  const categories = [...new Set(displayRules.map(r => r.category))].sort((a, b) => {
     let idxA = orderedCategories.indexOf(a);
     let idxB = orderedCategories.indexOf(b);
     if (idxA === -1) idxA = 99;
     if (idxB === -1) idxB = 99;
     return idxA - idxB;
  });

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handlePressAction = (rule: any) => {
    if (rule.requires_input) {
      setSelectedRule(rule);
      setInputValue('');
    } else {
      triggerHaptic();
      logAction(rule);
      toast.success(`Logged: ${rule.name}`, {
        style: { borderRadius: '12px', background: '#333', color: '#fff' }
      });
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
        triggerHaptic();
        logAction(selectedRule, multiplier);
        toast.success(`Logged: ${selectedRule.name} (${val})`, {
          style: { borderRadius: '12px', background: '#333', color: '#fff' }
        });
      }
      setSelectedRule(null);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '120px' }}>
      <Toaster position="bottom-center" />
      <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>All Rules</h2>
      
      {categories.map(category => (
        <div key={category} style={{ marginBottom: '32px' }}>
          <div className="section-title">{category.replace('_', ' ')}</div>
          <div className="card-list" style={{ marginBottom: 0 }}>
            {displayRules.filter(r => r.category === category).map(rule => (
              <ActionCard
                key={rule.id}
                rule={rule}
                onPress={() => handlePressAction(rule)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Input Modal */}
      {selectedRule && (
        <div className="modal-overlay" onClick={() => setSelectedRule(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
