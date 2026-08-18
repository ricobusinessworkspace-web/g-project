import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useTrackerStore } from '../store/trackerStore';

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const y = e.touches[0].clientY;
    const diff = y - startY;
    if (diff > 0 && window.scrollY === 0) {
      setPullY(Math.min(diff * 0.4, 60)); // max pull 60px
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    if (pullY > 50) {
      const { userId, fetchState } = useTrackerStore.getState();
      if (userId) {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        toast('Syncing data...', { icon: '🔄', style: { borderRadius: '12px', background: '#333', color: '#fff' } });
        await fetchState(userId);
      }
    }
    setPullY(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${pullY}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.1, 1, 0.4, 1)',
        minHeight: '100vh'
      }}
    >
      {children}
    </div>
  );
}
