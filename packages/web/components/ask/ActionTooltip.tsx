'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ActionTooltipProps {
  label: string;
  /** Delay in ms before tooltip shows (kept short so fast toolbar scans still feel responsive). */
  delay?: number;
  children: React.ReactNode;
}

/**
 * Lightweight tooltip wrapper — shows a brief label above the child element
 * after a hover delay. Auto-hides on mouse leave.
 */
export default function ActionTooltip({ label, delay = 140, children }: ActionTooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleEnter = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [clearTimer, delay]);

  const handleLeave = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <span
      className="relative inline-flex items-center justify-center"
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
            rounded-md bg-foreground/90 px-2 py-0.5 text-[11px] font-medium text-background
            shadow-sm animate-in fade-in-0 slide-in-from-bottom-1 duration-100 z-20"
        >
          {label}
        </span>
      )}
    </span>
  );
}
