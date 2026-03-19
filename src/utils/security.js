/**
 * Security utilities for SkyVault
 */

import crypto from 'crypto';

/**
 * Generate a secure random string
 * @param {number} length - Length of string
 * @param {string} charset - Character set to use
 * @returns {string} - Random string
 */
export function generateSecureString(length = 32, charset = 'alphanumeric') {
  const charsets = {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    alphanumericSpecial: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
    hex: '0123456789abcdef',
    base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    numeric: '0123456789',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  };
  
  const selectedCharset = charsets[charset] || charset;
  let result = '';
  const randomBytes = crypto.randomBytes(length * 2);
  
  for (let i = 0; i < length; i++) {
    result += selectedCharset[randomBytes[i] % selectedCharset.length];
  }
  
  return result;
}

/**
 * Calculate password strength score
 * @param {string} password - Password to analyze
 * @returns {object} - Strength analysis
 */
export function calculatePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      strength: 'none',
      entropy: 0,
      warnings: ['Password is empty']
    };
  }
  
  let score = 0;
  const warnings = [];
  
  // Length checks
  if (password.length < 8) {
    warnings.push('Password is too short (min 8 characters)');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }
  
  if (password.length >= 16) {
    score += 1;
  }
  
  // Character variety
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  let varietyCount = 0;
  if (hasLowercase) varietyCount++;
  if (hasUppercase) varietyCount++;
  if (hasNumbers) varietyCount++;
  if (hasSpecial) varietyCount++;
  
  score += varietyCount;
  
  // Warnings
  if (!hasLowercase) warnings.push('Add lowercase letters');
  if (!hasUppercase) warnings.push('Add uppercase letters');
  if (!hasNumbers) warnings.push('Add numbers');
  if (!hasSpecial) warnings.push('Add special characters');
  
  // Check for common patterns
  if (/^[a-zA-Z]+$/.test(password)) {
    warnings.push('Password is only letters');
    score -= 1;
  }
  
  if (/^[0-9]+$/.test(password)) {
    warnings.push('Password is only numbers');
    score -= 2;
  }
  
  // Check for repeated characters
  if (/(.+)\1{2,}/.test(password)) {
    warnings.push('Password has repeated patterns');
    score -= 1;
  }
  
  // Calculate entropy
  let poolSize = 0;
  if (hasLowercase) poolSize += 26;
  if (hasUppercase) poolSize += 26;
  if (hasNumbers) poolSize += 10;
  if (hasSpecial) poolSize += 32;
  
  const entropy = Math.log2(Math.pow(poolSize, password.length));
  
  // Determine strength label
  let strength = 'weak';
  if (score >= 6 && entropy > 60) {
    strength = 'strong';
  } else if (score >= 4 && entropy > 40) {
    strength = 'medium';
  }
  
  return {
    score: Math.max(0, score),
    strength,
    entropy: Math.round(entropy),
    length: password.length,
    varietyCount,
    warnings: warnings.length > 0 ? warnings : null
  };
}

/**
 * Check if password has been exposed in breaches
 * Uses k-anonymity to check Have I Been Pwned API
 * @param {string} password - Password to check
 * @returns {Promise<object>} - Breach check result
 */
export async function checkPasswordBreach(password) {
  // This is a placeholder - actual implementation would call HIBP API
  // For security, this should be done client-side with k-anonymity
  
  return {
    breached: false,
    count: 0,
    message: 'Password breach checking not implemented'
  };
}

/**
 * Zero out a buffer securely
 * @param {Buffer} buffer - Buffer to clear
 */
export function secureClear(buffer) {
  if (buffer && Buffer.isBuffer(buffer)) {
    buffer.fill(0);
  }
}

/**
 * Constant-time string comparison
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if equal
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  // Use crypto.timingSafeEqual if available
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    // Fallback for older Node versions
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

/**
 * Generate a UUID v4
 * @returns {string} - UUID
 */
export function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Hash a string using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - Hex encoded hash
 */
export function hashString(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate a cryptographically secure random integer
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} - Random integer
 */
export function secureRandomInt(min, max) {
  const range = max - min;
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32LE(0);
  return min + (randomValue % range);
}

/**
 * Escape special regex characters
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mask sensitive data in logs
 * @param {string} data - Data to mask
 * @param {number} visibleChars - Number of visible characters at start/end
 * @returns {string} - Masked data
 */
export function maskSensitiveData(data, visibleChars = 4) {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(data ? data.length : 0);
  }
  
  const start = data.slice(0, visibleChars);
  const end = data.slice(-visibleChars);
  const middle = '*'.repeat(Math.min(data.length - visibleChars * 2, 10));
  
  return `${start}${middle}${end}`;
}

/**
 * Validate file path for path traversal
 * @param {string} filePath - Path to validate
 * @param {string} basePath - Allowed base directory
 * @returns {object} - Validation result
 */
export function validateSafePath(filePath, basePath) {
  const path = await import('path');
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(basePath);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    return {
      valid: false,
      error: 'Path traversal detected'
    };
  }
  
  return {
    valid: true,
    resolvedPath
  };
}

/**
 * Detect secret patterns in text
 * @param {string} text - Text to scan
 * @returns {object[]} - Detected patterns
 */
export function detectSecretPatterns(text) {
  const patterns = [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
    { name: 'AWS Secret Key', regex: /[0-9a-zA-Z/+]{40}/g },
    { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
    { name: 'Private Key', regex: /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g },
    { name: 'API Key', regex: /[a-zA-Z0-9_-]{32,64}/g },
    { name: 'Password', regex: /password[=:]\s*.+/gi },
    { name: 'Secret', regex: /secret[=:]\s*.+/gi },
    { name: 'Token', regex: /token[=:]\s*.+/gi }
  ];
  
  const detected = [];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern.regex);
    if (matches) {
      detected.push({
        type: pattern.name,
        count: matches.length,
        samples: matches.slice(0, 3).map(m => m.slice(0, 20) + '...')
      });
    }
  }
  
  return detected;
}

/**
 * Rate limiter for authentication attempts
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }
  
  /**
   * Check if operation is allowed
   * @param {string} key - Identifier (IP, user, etc.)
   * @returns {object} - Result
   */
  check(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // Clean old attempts
    const recentAttempts = userAttempts.filter(
      attempt => now - attempt < this.windowMs
    );
    
    if (recentAttempts.length >= this.maxAttempts) {
      const oldestAttempt = recentAttempts[0];
      const retryAfter = Math.ceil((this.windowMs - (now - oldestAttempt)) / 1000);
      
      return {
        allowed: false,
        retryAfter,
        message: `Too many attempts. Try again in ${retryAfter}s`
      };
    }
    
    return {
      allowed: true,
      remaining: this.maxAttempts - recentAttempts.length
    };
  }
  
  /**
   * Record an attempt
   * @param {string} key - Identifier
   */
  recordAttempt(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    userAttempts.push(now);
    this.attempts.set(key, userAttempts);
  }
  
  /**
   * Reset attempts for a key
   * @param {string} key - Identifier
   */
  reset(key) {
    this.attempts.delete(key);
  }
}
