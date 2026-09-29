/**
 * Validates password against security complexity requirements.
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one special character
 * 
 * @param {string} password - The raw password string to validate
 * @returns {string[]} Array of unmet requirement descriptions, or empty array if all pass
 */
export function validatePassword(password) {
  const unmet = [];
  const str = typeof password === 'string' ? password : '';

  if (str.length < 8) {
    unmet.push('at least 8 characters');
  }

  if (!/[A-Z]/.test(str)) {
    unmet.push('at least one uppercase letter');
  }

  if (!/[a-z]/.test(str)) {
    unmet.push('at least one lowercase letter');
  }

  if (!/[0-9]/.test(str)) {
    unmet.push('at least one digit');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(str) && !/[^A-Za-z0-9\s]/.test(str)) {
    unmet.push('at least one special character');
  }

  return unmet;
}

export default validatePassword;
