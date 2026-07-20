import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import ActionCard from './ActionCard';
import { Rule } from '../store/trackerStore';

interface SortableRuleItemProps {
  rule: Rule;
  isEditing: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  deleteConfirmId: string | null;
}

export function SortableRuleItem({ 
  rule, 
  isEditing, 
  onPress, 
  onEdit, 
  onDeleteRequest, 
  onDeleteConfirm, 
  deleteConfirmId 
}: SortableRuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
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
          <button
            {...attributes}
            {...listeners}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '6px', 
              cursor: 'grab', 
              display: 'flex', 
              alignItems: 'center',
              touchAction: 'none'
            }}
          >
            <GripVertical size={16} color="var(--text-secondary)" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{ background: 'rgba(10,132,255,0.15)', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
          >
            <Pencil size={16} color="#0A84FF" />
          </button>

          {deleteConfirmId === rule.id ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteConfirm(); }}
              style={{ background: 'var(--error-color)', border: 'none', borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}
            >
              Confirm
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }}
              style={{ background: 'rgba(255,59,48,0.15)', border: 'none', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={16} color="#FF3B30" />
            </button>
          )}
        </div>
      )}
      
      <ActionCard
        rule={rule}
        onPress={onPress}
        hideValue={isEditing}
      />
    </div>
  );
}
