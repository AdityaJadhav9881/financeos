import { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../utils/styles';

export default function AnimatedOdometer({ value, duration = 1.5, className = '', format = true }) {
  const [display, setDisplay] = useState(0);
  const [flash, setFlash] = useState(null);
  const ref = useRef(null);
  const hasAnimated = useRef(false);
  const prevValue = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = prevValue.current;
    prevValue.current = target;

    if (hasAnimated.current && start === target) return;
    hasAnimated.current = true;

    let flashTimeout;
    if (start !== target) {
      setFlash(target > start ? 'up' : 'down');
      flashTimeout = setTimeout(() => setFlash(null), 600);
    }

    const startTime = performance.now();
    const durationMs = duration * 1000;

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;

      setDisplay(current);

      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    }

    ref.current = requestAnimationFrame(tick);

    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
      if (flashTimeout) clearTimeout(flashTimeout);
    };
  }, [value, duration]);

  const formatted = format ? formatCurrency(display) : display.toFixed(2);

  return (
    <span
      className={`transition-colors duration-500 ${
        flash === 'up' ? 'text-emerald-400' : flash === 'down' ? 'text-red-400' : ''
      } ${className}`}
    >
      {formatted}
    </span>
  );
}
