'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/utils/authContext';
import {
  getTimeUntilLogout,
  isDailyLogoutTime,
  wasDailyLogoutProcessedToday,
  markDailyLogoutProcessed,
  clearSessionActivity
} from '@/utils/sessionTimeout';
import { useRouter } from 'next/navigation';

/**
 * Hook to handle session timeout
 * Logs out users who logged in before 7 AM today, and daily logout at 7 AM
 */
export function useSessionTimeout() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const dailyLogoutRef = useRef(null);

  useEffect(() => {
    if (!user) {
      // Clean up if no user is logged in
      if (dailyLogoutRef.current) clearTimeout(dailyLogoutRef.current);
      return;
    }

    // Check if user logged in before 7 AM today - if so, logout immediately
    const checkLoginTime = async () => {
      try {
        const response = await fetch('/api/check-login-time', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: user.email }),
        });

        if (!response.ok) {
          throw new Error('Failed to check login time');
        }

        const data = await response.json();
        if (data.shouldLogout) {
          console.log('User logged in before 7 AM today - logging out');
          clearSessionActivity();
          logout();
          router.push('/login?reason=early-login-logout');
          return;
        }
      } catch (error) {
        console.error('Error checking login time:', error);
        // On error, continue with normal flow
      }
    };

    checkLoginTime();

    // Set up daily logout at 7:00 AM
    const setupDailyLogout = () => {
      const timeUntilLogout = getTimeUntilLogout();
      if (timeUntilLogout > 0) { // Only set timeout if logout time is in the future
        dailyLogoutRef.current = setTimeout(() => {
          console.log('Daily logout time (7:00 AM) reached - logging out');
          markDailyLogoutProcessed();
          clearSessionActivity();
          logout();
          router.push('/login?reason=daily-logout');
        }, timeUntilLogout);
      }
    };

    setupDailyLogout();

    // Cleanup on unmount or when user logs out
    return () => {
      if (dailyLogoutRef.current) clearTimeout(dailyLogoutRef.current);
    };
  }, [user, logout, router]);

  // Return helper functions for components that need them
  return {
    logout: () => {
      clearSessionActivity();
      logout();
      router.push('/login');
    }
  };
}
