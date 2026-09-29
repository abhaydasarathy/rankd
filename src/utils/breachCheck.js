/**
 * Checks whether a password has appeared in a known data breach
 * using the HaveIBeenPwned k-anonymity Passwords API.
 * 
 * Only the first 5 characters of the SHA-1 hash are transmitted
 * to the API, preserving complete client-side privacy.
 * 
 * @param {string} password - The raw password to check
 * @returns {Promise<boolean>} - True if breached, false if safe or on network failure
 */
async function computeSha1Hex(text) {
  const subtleCrypto = (typeof crypto !== 'undefined' && crypto.subtle)
    ? crypto.subtle
    : (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle)
      ? globalThis.crypto.subtle
      : null;

  if (subtleCrypto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await subtleCrypto.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  return '';
}

export async function isPasswordBreached(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }

  try {
    const hash = await computeSha1Hex(password);
    if (!hash || hash.length !== 40) {
      return false;
    }

    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true',
      },
      signal: controller ? controller.signal : undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      // Fail-open on non-200 API responses so legitimate users are not locked out
      return false;
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const parts = line.trim().split(':');
      if (parts.length >= 2) {
        const hashSuffix = parts[0].trim().toUpperCase();
        const count = parseInt(parts[1].trim(), 10);
        if (hashSuffix === suffix && count > 0) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    // Fail-open gracefully on network error or timeout
    return false;
  }
}

export default isPasswordBreached;
