// utils/passwordUtils.js

/**
 * Checks password strength similar to GitHub-style validation.
 * Rules:
 *  - At least 8 characters
 *  - At least 1 uppercase letter
 *  - At least 1 number
 *  - At least 1 special character
 *
 * @param {string} password
 * @returns {{ valid: boolean, score: number, feedback: string }}
 */
export function validatePassword(password) {
  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-\\[\]\/~]/.test(password),
  };

  const passed = Object.values(rules).filter(Boolean).length;
  const valid = passed === 4;

  let feedback = '';
  if (!rules.length) feedback = 'Use at least 8 characters.';
  else if (!rules.upper) feedback = 'Add at least one uppercase letter.';
  else if (!rules.number) feedback = 'Add at least one number.';
  else if (!rules.special) feedback = 'Add at least one special character.';
  else feedback = 'Strong password!';

  return {
    valid,
    score: passed, // 0–4
    feedback,
  };
}
