'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/utils/authContext';
import {
  updateLastActivity,
  isSessionExpired,
  getRemainingSessionTime,
  clearSessionActivity,
  SESSION_TIMEOUT
} from '@/utils/sessionTimeout';
import { useRouter } from 'next/navigation';

/**
 * Hook to handle automatic session timeout
 * Logs out the user if they're inactive for the specified duration
 * Tracks user activity (mouse, keyboard, touch, scroll)
 */
export function useSessionTimeout() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const timeoutRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);

  // Handler for user activity
  const handleUserActivity = useCallback(() => {
    if (!user) return;

    // Update last activity timestamp
    updateLastActivity();

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Set a new inactivity timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      if (isSessionExpired()) {
        console.log('Session expired due to inactivity');
        clearSessionActivity();
        logout();
        router.push('/login?reason=session-expired');
      }
    }, SESSION_TIMEOUT);
  }, [user, logout, router]);

  useEffect(() => {
    if (!user) {
      // Clean up if no user is logged in
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      return;
    }

    // Initialize last activity on mount
    updateLastActivity();

    // Event listeners for user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Add event listeners with passive option for better performance
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Set initial timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      if (isSessionExpired()) {
        console.log('Session expired due to inactivity');
        clearSessionActivity();
        logout();
        router.push('/login?reason=session-expired');
      }
    }, SESSION_TIMEOUT);

    // Optional: Check every minute if session has expired (useful for debugging)
    checkIntervalRef.current = setInterval(() => {
      if (isSessionExpired()) {
        console.log('Session expired (from interval check)');
        clearSessionActivity();
        logout();
        router.push('/login?reason=session-expired');
      }
    }, 60 * 1000); // Check every minute

    // Cleanup on unmount or when user logs out
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
    };
  }, [user, handleUserActivity, logout, router]);

  // Return helper functions for components that need them
  return {
    getRemainingTime: getRemainingSessionTime,
    logout: () => {
      clearSessionActivity();
      logout();
      router.push('/login');
    }
  };
}
