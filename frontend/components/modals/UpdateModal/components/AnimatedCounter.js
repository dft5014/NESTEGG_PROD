// Animated Counter Component for Update Modal
import React, { useState, useEffect, useRef } from 'react';

/**
 * Animated counter that smoothly transitions between values
 */
const AnimatedCounter = ({
  value,
  prefix = '',
  suffix = '',
  duration = 500,
  decimals = 0,
  formatter = null,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);
  const startValue = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const targetValue = typeof value === 'number' ? value : 0;
    startValue.current = displayValue;

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;

      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      const current = startValue.current + (targetValue - startValue.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    startTime.current = null;
    rafId.current = requestAnimationFrame(animate);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [value, duration]);

  // Format the display value
  const formatted = formatter
    ? formatter(displayValue)
    : decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.floor(displayValue).toLocaleString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
};

/**
 * Animated currency counter
 */
export const AnimatedCurrency = ({
  value,
  duration = 500,
  showSign = false,
  hideDecimals = false,
  className = ''
}) => {
  const formatter = (val) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: hideDecimals ? 0 : 2
    }).format(Math.abs(val));

    if (showSign && val !== 0) {
      return (val > 0 ? '+' : '-') + formatted.replace('-', '');
    }
    return val < 0 ? '-' + formatted : formatted;
  };

  return (
    <AnimatedCounter
      value={value}
      duration={duration}
      formatter={formatter}
      className={className}
    />
  );
};

/**
 * Animated percentage counter
 */
export const AnimatedPercent = ({
  value,
  duration = 500,
  showSign = false,
  decimals = 2,
  className = ''
}) => {
  const formatter = (val) => {
    const formatted = Math.abs(val).toFixed(decimals) + '%';
    if (showSign && val !== 0) {
      return (val > 0 ? '+' : '-') + formatted;
    }
    return val < 0 ? '-' + formatted : formatted;
  };

  return (
    <AnimatedCounter
      value={value}
      duration={duration}
      formatter={formatter}
      className={className}
    />
  );
};

export default AnimatedCounter;
