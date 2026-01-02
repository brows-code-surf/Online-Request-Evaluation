// Session timeout configuration
// Daily logout at 7:00 AM configuration
export const DAILY_LOGOUT_HOUR = 7; // 7 AM
export const DAILY_LOGOUT_MINUTE = 0; // 7:00 AM

// Key for storing daily logout processing status
export const DAILY_LOGOUT_KEY = 'lastDailyLogoutDate';

/**
 * Clears the session data (daily logout status)
 */
export const clearSessionActivity = () => {
  try {
    if (typeof window !== 'undefined') {
      clearDailyLogoutProcessed();
    }
  } catch (error) {
    console.error('Error clearing session activity:', error);
  }
};

/**
 * Gets the next daily logout timestamp in milliseconds
 * @returns {number} Timestamp of next logout time
 */
export const getNextLogoutTimestamp = () => {
  const now = new Date();
  const nextLogout = new Date(now);

  // Set to logout time today
  nextLogout.setHours(DAILY_LOGOUT_HOUR, DAILY_LOGOUT_MINUTE, 0, 0);

  // If it's already past logout time today, set to logout time tomorrow
  if (now >= nextLogout) {
    nextLogout.setDate(nextLogout.getDate() + 1);
  }

  return nextLogout.getTime();
};

/**
 * Gets the milliseconds until next logout time
 * @returns {number} Milliseconds until logout time
 */
export const getTimeUntilLogout = () => {
  return getNextLogoutTimestamp() - Date.now();
};

/**
 * Checks if it's time for daily logout
 * @returns {boolean} True if it's logout time or later
 */
export const isDailyLogoutTime = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check if it's logout time or later
  if (currentHour > DAILY_LOGOUT_HOUR) {
    return true;
  } else if (currentHour === DAILY_LOGOUT_HOUR && currentMinute >= DAILY_LOGOUT_MINUTE) {
    return true;
  }

  return false;
};

/**
 * Checks if the daily logout has already been processed today
 * @returns {boolean} True if logout was already processed today
 */
export const wasDailyLogoutProcessedToday = () => {
  try {
    if (typeof window !== 'undefined') {
      const lastLogoutDate = localStorage.getItem('lastDailyLogoutDate');
      if (!lastLogoutDate) return false;

      const today = new Date().toDateString();
      return lastLogoutDate === today;
    }
  } catch (error) {
    console.error('Error checking daily logout status:', error);
  }
  return false;
};

/**
 * Marks the daily logout as processed for today
 */
export const markDailyLogoutProcessed = () => {
  try {
    if (typeof window !== 'undefined') {
      const today = new Date().toDateString();
      localStorage.setItem('lastDailyLogoutDate', today);
    }
  } catch (error) {
    console.error('Error marking daily logout as processed:', error);
  }
};

/**
 * Clears the daily logout processed flag
 */
export const clearDailyLogoutProcessed = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lastDailyLogoutDate');
    }
  } catch (error) {
    console.error('Error clearing daily logout processed flag:', error);
  }
};
