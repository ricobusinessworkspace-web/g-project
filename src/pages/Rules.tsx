import React, { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ActionCard from '../components/ActionCard';
import { Rule, useTrackerStore } from '../store/trackerStore';
import { Plus, Pencil, Trash2, X, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';

const CATEGORY_ORDER = ['REOCCURING', 'ONCE_DAILY', 'EXERCISE', 'RECREATIONAL', 'BUSINESS', 'ABBAUEN', 'GN'];
const ALL_CATEGORIES = ['REOCCURING', 'ONCE_DAILY', 'EXERCISE', 'RECREATIONAL', 'BUSINESS', 'ABBAUEN', 'GN', 'GM'];
const ICON_OPTIONS = ['Sun', 'Moon', 'Clock', 'Bed', 'Cat', 'Phone', 'Pill', 'Pizza', 'Smartphone', 'Flame', 'MonitorPlay', 'Lock', 'Hand', 'Dumbbell', 'Activity', 'Footprints', 'Swords', 'Banknote', 'PhoneCall', 'Camera', 'ThermometerSnowflake', 'Code', 'BookOpen', 'Headphones', 'Gamepad2', 'Book', 'Wind', 'PenTool', 'Circle', 'Star', 'Heart', 'Zap', 'Coffee', 'Music', 'Bike', 'Car', 'Plane', 'Globe', 'Shield', 'Award'];

interface RuleFormState {
  name: string;
  category: string;
  impact_type: 'POINTS' | 'DEBT';
  base_value: string;
  iconName: string;
  description: string;
  daily_max: string;
  weekly_max: string;
  free_uses_per_week: string;
  requires_input: boolean;
  input_step: string;
  time_modifier: string;
}

const emptyForm: RuleFormState = {
  name: '',
  category: 'REOCCURING',
  impact_type: 'POINTS',
  base_value: '1',
  iconName: 'Circle',
  description: '',
  daily_max: '',
  weekly_max: '',
  free_uses_per_week: '',
  requires_input: false,
  input_step: '',
  time_modifier: '',
};

export default function RulesPage() {
  const { rules, logAction, addRule, updateRule, deleteRule, reorderRule } = useTrackerStore();
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const displayRules = rules.filter(r => r.category !== 'GM' || r.id === 'gm_4');
  const categories = [...new Set(displayRules.map(r => r.category))].sort((a, b) => {
     let idxA = CATEGORY_ORDER.indexOf(a);
     let idxB = CATEGORY_ORDER.indexOf(b);
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
    if (isEditing) return; // Don't log actions while editing
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

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingRule(null);
    setSelectedRule('editor');
  };

  const openEditModal = (rule: Rule) => {
    setForm({
      name: rule.name,
      category: rule.category,
      impact_type: rule.impact_type,
      base_value: rule.base_value.toString(),
      iconName: rule.iconName,
      description: rule.description || '',
      daily_max: rule.daily_max?.toString() || '',
      weekly_max: rule.weekly_max?.toString() || '',
      free_uses_per_week: rule.free_uses_per_week?.toString() || '',
      requires_input: rule.requires_input || false,
      input_step: rule.input_step?.toString() || '',
      time_modifier: rule.time_modifier || '',
    });
    setEditingRule(rule);
    setSelectedRule('editor');
  };

  const handleSaveRule = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }

    const ruleData: any = {
      name: form.name.trim(),
      category: form.category,
      impact_type: form.impact_type,
      base_value: parseFloat(form.base_value) || 0,
      iconName: form.iconName,
      description: form.description.trim() || undefined,
      daily_max: form.daily_max ? parseInt(form.daily_max) : undefined,
      weekly_max: form.weekly_max ? parseInt(form.weekly_max) : undefined,
      free_uses_per_week: form.free_uses_per_week ? parseInt(form.free_uses_per_week) : undefined,
      requires_input: form.requires_input,
      input_step: form.input_step ? parseInt(form.input_step) : undefined,
      time_modifier: form.time_modifier || undefined,
    };

    if (editingRule) {
      await updateRule({ ...ruleData, id: editingRule.id });
      toast.success(`Updated: ${form.name}`, { style: { borderRadius: '12px', background: '#333', color: '#fff' } });
    } else {
      await addRule(ruleData);
      toast.success(`Created: ${form.name}`, { style: { borderRadius: '12px', background: '#333', color: '#fff' } });
    }
    
    triggerHaptic();
    setSelectedRule(null);
    setEditingRule(null);
  };

  const handleDelete = async (ruleId: string) => {
    await deleteRule(ruleId);
    triggerHaptic();
    toast.success('Rule deleted', { style: { borderRadius: '12px', background: '#333', color: '#fff' } });
    setDeleteConfirm(null);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--card-border)',
    background: 'var(--card-bg)',
    color: 'white',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div className="container" style={{ paddingBottom: '120px' }}>
      <Toaster position="bottom-center" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ textAlign: 'center', margin: 0, flex: 1 }}>All Rules</h2>
        <button 
          onClick={() => { setIsEditing(!isEditing); setDeleteConfirm(null); }}
          style={{ 
            background: isEditing ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)', 
            border: 'none', 
            color: isEditing ? 'white' : 'var(--text-secondary)', 
            padding: '8px 16px', 
            borderRadius: '12px', 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isEditing ? 'Done' : 'Edit'}
        </button>
      </div>
      
      {categories.map(category => (
        <div key={category} style={{ marginBottom: '32px' }}>
          <div className="section-title">{category.replace('_', ' ')}</div>
          <div className="card-list" style={{ marginBottom: 0 }}>
            {displayRules.filter(r => r.category === category).map((rule, idx, arr) => (
              <div key={rule.id} style={{ position: 'relative' }}>
                {isEditing && (
                  <div style={{ 
                    position: 'absolute', 
                    right: '0', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    display: 'flex', 
                    gap: '4px', 
                    zIndex: 10,
                    paddingRight: '8px'
                  }}>
                    {idx > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); reorderRule(rule.id, 'UP'); }}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <ArrowUp size={16} color="var(--text-secondary)" />
                      </button>
                    )}
                    {idx < arr.length - 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); reorderRule(rule.id, 'DOWN'); }}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <ArrowDown size={16} color="var(--text-secondary)" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(rule); }}
                      style={{ background: 'rgba(10,132,255,0.15)', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
                    >
                      <Pencil size={16} color="#0A84FF" />
                    </button>
                    {deleteConfirm === rule.id ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(rule.id); }}
                        style={{ background: 'var(--error-color)', border: 'none', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(rule.id); }}
                        style={{ background: 'rgba(255,59,48,0.15)', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={16} color="#FF3B30" />
                      </button>
                    )}
                  </div>
                )}
                <ActionCard
                  rule={rule}
                  onPress={() => handlePressAction(rule)}
                  hideValue={isEditing}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Floating Add Button */}
      <button
        onClick={openCreateModal}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent-color)',
          border: 'none',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(52,199,89,0.4)',
          zIndex: 100,
          transition: 'transform 0.2s ease',
        }}
      >
        <Plus size={28} />
      </button>

      {/* Value Input Modal (for rules with requires_input) */}
      {selectedRule && selectedRule !== 'editor' && (
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

      {/* Rule Editor Modal */}
      {selectedRule === 'editor' && (
        <div className="modal-overlay" onClick={() => { setSelectedRule(null); setEditingRule(null); }}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxHeight: '80vh', 
              overflowY: 'auto', 
              padding: '24px',
              width: '92%',
              maxWidth: '420px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{editingRule ? 'Edit Rule' : 'New Rule'}</h3>
              <button onClick={() => { setSelectedRule(null); setEditingRule(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name</label>
                <input 
                  style={inputStyle} 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="e.g. 100 Pushups"
                />
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}>Category</label>
                <select 
                  style={{...inputStyle, appearance: 'none'}} 
                  value={form.category} 
                  onChange={e => setForm({...form, category: e.target.value})}
                >
                  {ALL_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Impact Type + Base Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select 
                    style={{...inputStyle, appearance: 'none'}} 
                    value={form.impact_type} 
                    onChange={e => setForm({...form, impact_type: e.target.value as 'POINTS' | 'DEBT'})}
                  >
                    <option value="POINTS">Points</option>
                    <option value="DEBT">Debt</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Value</label>
                  <input 
                    style={inputStyle} 
                    type="number" 
                    value={form.base_value} 
                    onChange={e => setForm({...form, base_value: e.target.value})} 
                    placeholder="-1"
                  />
                </div>
              </div>

              {/* Icon */}
              <div>
                <label style={labelStyle}>Icon</label>
                <select 
                  style={{...inputStyle, appearance: 'none'}} 
                  value={form.iconName} 
                  onChange={e => setForm({...form, iconName: e.target.value})}
                >
                  {ICON_OPTIONS.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description (optional)</label>
                <input 
                  style={inputStyle} 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  placeholder="e.g. After 12 PM, 1x 30 minutes free"
                />
              </div>

              {/* Limits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Daily Max</label>
                  <input 
                    style={inputStyle} 
                    type="number" 
                    value={form.daily_max} 
                    onChange={e => setForm({...form, daily_max: e.target.value})} 
                    placeholder="—"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Weekly Max</label>
                  <input 
                    style={inputStyle} 
                    type="number" 
                    value={form.weekly_max} 
                    onChange={e => setForm({...form, weekly_max: e.target.value})} 
                    placeholder="—"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Free/Wk</label>
                  <input 
                    style={inputStyle} 
                    type="number" 
                    value={form.free_uses_per_week} 
                    onChange={e => setForm({...form, free_uses_per_week: e.target.value})} 
                    placeholder="—"
                  />
                </div>
              </div>

              {/* Advanced toggles */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Requires Manual Input</span>
                <label className="switch">
                  <input type="checkbox" checked={form.requires_input} onChange={e => setForm({...form, requires_input: e.target.checked})} />
                  <span className="slider"></span>
                </label>
              </div>

              {form.requires_input && (
                <div>
                  <label style={labelStyle}>Input Step</label>
                  <input 
                    style={inputStyle} 
                    type="number" 
                    value={form.input_step} 
                    onChange={e => setForm({...form, input_step: e.target.value})} 
                    placeholder="e.g. 10"
                  />
                </div>
              )}

              <div>
                <label style={labelStyle}>Time Modifier</label>
                <select 
                  style={{...inputStyle, appearance: 'none'}} 
                  value={form.time_modifier} 
                  onChange={e => setForm({...form, time_modifier: e.target.value})}
                >
                  <option value="">None</option>
                  <option value="DOUBLE_BEFORE_6AM">Double Before 6 AM</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                className="modal-btn modal-btn-cancel" 
                style={{ flex: 1 }}
                onClick={() => { setSelectedRule(null); setEditingRule(null); }}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-primary" 
                style={{ flex: 1 }}
                onClick={handleSaveRule}
              >
                {editingRule ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
