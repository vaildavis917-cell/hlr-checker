import { useEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

// Default timeout: 30 minutes
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
// Warning before logout: 2 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000;

interface UseAutoLogoutOptions {
  timeoutMs?: number;
  warningMs?: number;
  enabled?: boolean;
  onWarning?: (remainingMs: number) => void;
  onLogout?: () => void;
}

export function useAutoLogout({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = WARNING_BEFORE_MS,
  enabled = true,
  onWarning,
  onLogout,
}: UseAutoLogoutOptions = {}) {
  const [, setLocation] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  // Perform logout
  const performLogout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Auto-logout error:", error);
    }
    
    onLogout?.();
    setLocation("/login?reason=timeout");
  }, [clearTimers, logoutMutation, onLogout, setLocation]);

  // Reset activity timer
  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    clearTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingTime(warningMs);
      onWarning?.(warningMs);
      
      // Start countdown
      const countdownInterval = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            clearInterval(countdownInterval);
          }
          return Math.max(0, newTime);
        });
      }, 1000);
      
      // Store interval for cleanup
      (warningRef.current as any)._countdownInterval = countdownInterval;
    }, timeoutMs - warningMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      performLogout();
    }, timeoutMs);
  }, [enabled, clearTimers, timeoutMs, warningMs, onWarning, performLogout]);

  // Extend session (user clicked "Stay logged in")
  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Track user activity
  useEffect(() => {
    if (!enabled) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    
    // Throttle activity detection
    let lastEventTime = 0;
    const throttleMs = 5000; // Only reset timer every 5 seconds max
    
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastEventTime > throttleMs) {
        lastEventTime = now;
        // Only reset if not showing warning (user must explicitly extend)
        if (!showWarning) {
          resetTimer();
        }
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
      
      // Clear countdown interval if exists
      if ((warningRef.current as any)?._countdownInterval) {
        clearInterval((warningRef.current as any)._countdownInterval);
      }
    };
  }, [enabled, resetTimer, clearTimers, showWarning]);

  return {
    showWarning,
    remainingTime,
    extendSession,
    performLogout,
    resetTimer,
  };
}

export default useAutoLogout;
