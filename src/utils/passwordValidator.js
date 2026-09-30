/**
 * Validates password against length requirement.
 * 
 * Requirement:
 * - Minimum 8 characters (configurable, defaults to 8)
 * 
 * @param {string} password - The raw password string to validate
 * @param {number} [minLength=8] - Minimum required character length
 * @returns {string[]} Array of unmet requirement descriptions, or empty array if valid
 */
export function validatePassword(password, minLength = 8) {
  const unmet = [];
  const str = typeof password === 'string' ? password : '';

  if (str.length < minLength) {
    unmet.push(`at least ${minLength} characters`);
  }

  return unmet;
}

export default validatePassword;
