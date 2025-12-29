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
 * Hook to handle daily logout at 2:45 PM Philippine Time
 * Logs out the user every day at 2:45 PM in the Philippines (for testing)
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

    // Removed immediate logout check - only scheduled logout via timeout

    // Set up daily logout at 2:45 PM Philippine Time
    const setupDailyLogout = () => {
      const timeUntilLogout = getTimeUntilLogout();
      if (timeUntilLogout > 0) { // Only set timeout if logout time is in the future
        dailyLogoutRef.current = setTimeout(() => {
          console.log('Daily logout time (2:45 PM Philippine Time) reached - logging out');
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
