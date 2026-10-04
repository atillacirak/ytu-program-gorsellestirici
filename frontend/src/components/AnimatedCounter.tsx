import React, { useEffect, useState } from 'react';

export default function AnimatedCounter({ value, decimals = 0 }: { value: number, decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1000; // 1s animation
    const start = displayValue;
    const end = value;

    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const easeOutQuart = (t: number) => 1 - (--t) * t * t * t;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const currentVal = start + (end - start) * easeOutQuart(percentage);
      setDisplayValue(currentVal);

      if (progress < duration) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <>{displayValue.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}
