import { useCallback, useRef, useState } from 'react';
import { hapticLight, hapticMedium } from '../utils/haptics';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(null);
  const containerRef = useRef(null);
  const hapticFiredRef = useRef(false);

  const THRESHOLD = 80;

  const handleTouchStart = useCallback((e) => {
    if (isRefreshing) return;
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    hapticFiredRef.current = false;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (startYRef.current === null || isRefreshing) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) {
      const dist = Math.min(diff * 0.5, 120);
      setPullDistance(dist);
      if (dist >= THRESHOLD && !hapticFiredRef.current) {
        hapticFiredRef.current = true;
        hapticMedium();
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        hapticLight();
      }
    }
    setPullDistance(0);
    startYRef.current = null;
  }, [pullDistance, isRefreshing, onRefresh]);

  const rotation = pullDistance > 0 ? (pullDistance / THRESHOLD) * 360 : 0;

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{ height: pullDistance > 0 ? pullDistance : 0 }}
      >
        {pullDistance > 0 && (
          <svg
            className={`h-6 w-6 text-cyan-400 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
            style={!isRefreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
      </div>
      {children}
    </div>
  );
}
