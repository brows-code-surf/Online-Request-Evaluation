// Session timeout configuration
// Set in milliseconds
// export const SESSION_TIMEOUT = 1 * 60 * 60 * 1000; // 1 hour (adjust as needed, 1 week = 7 * 24 * 60 * 60 * 1000)
// For 1 week:
export const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 1 week

// export const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Key for storing last activity timestamp in localStorage
export const LAST_ACTIVITY_KEY = 'lastActivityTimestamp';

/**
 * Updates the last activity timestamp in localStorage
 * Call this function on user interactions
 */
export const updateLastActivity = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  } catch (error) {
    console.error('Error updating last activity:', error);
  }
};

/**
 * Gets the last activity timestamp from localStorage
 * @returns {number} Last activity timestamp in milliseconds
 */
export const getLastActivity = () => {
  try {
    if (typeof window !== 'undefined') {
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      return lastActivity ? parseInt(lastActivity, 10) : Date.now();
    }
  } catch (error) {
    console.error('Error getting last activity:', error);
    return Date.now();
  }
};

/**
 * Checks if the session has expired
 * @returns {boolean} True if session has expired
 */
export const isSessionExpired = () => {
  try {
    const lastActivity = getLastActivity();
    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - lastActivity;
    return timeSinceLastActivity > SESSION_TIMEOUT;
  } catch (error) {
    console.error('Error checking session expiration:', error);
    return false;
  }
};

/**
 * Gets the remaining session time in milliseconds
 * @returns {number} Remaining time in milliseconds
 */
export const getRemainingSessionTime = () => {
  try {
    const lastActivity = getLastActivity();
    const currentTime = Date.now();
    const timeSinceLastActivity = currentTime - lastActivity;
    const remaining = SESSION_TIMEOUT - timeSinceLastActivity;
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    console.error('Error getting remaining session time:', error);
    return SESSION_TIMEOUT;
  }
};

/**
 * Clears the session activity data
 */
export const clearSessionActivity = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    }
  } catch (error) {
    console.error('Error clearing session activity:', error);
  }
};
