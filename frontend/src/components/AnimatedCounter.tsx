import React, { useEffect, useState } from 'react';

export default function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const end = value;
    if (start === end) return;

    let startTime: number | null = null;
    
    const easeOutQuart = (t: number) => 1 - (--t) * t * t * t;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      setDisplayValue(Math.floor(start + (end - start) * easeOutQuart(percentage)));

      if (progress < duration) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <>{displayValue.toLocaleString('tr-TR')}</>;
}
