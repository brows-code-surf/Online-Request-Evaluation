const loginAttempts = new Map();
const ATTEMPT_LIMIT = 3;
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

export function checkRateLimit(email) {
  const now = Date.now();
  const userAttempts = loginAttempts.get(email) || [];

  // Remove attempts outside the time window
  const recentAttempts = userAttempts.filter(time => now - time < ATTEMPT_WINDOW);

  if (recentAttempts.length >= ATTEMPT_LIMIT) {
    const oldestAttempt = recentAttempts[0];
    const timeUntilReset = ATTEMPT_WINDOW - (now - oldestAttempt);
    const minutesRemaining = Math.ceil(timeUntilReset / 60000);
    
    return {
      allowed: false,
      minutesRemaining
    };
  }

  return { allowed: true };
}

export function recordLoginAttempt(email) {
  const now = Date.now();
  const userAttempts = loginAttempts.get(email) || [];
  userAttempts.push(now);
  loginAttempts.set(email, userAttempts);
}

export function resetLoginAttempts(email) {
  loginAttempts.delete(email);
}
