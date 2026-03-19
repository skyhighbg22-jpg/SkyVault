/**
 * Validation utilities for SkyVault
 */

// Valid name pattern: alphanumeric, underscore, hyphen
const VALID_NAME_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

// Valid provider pattern: lowercase alphanumeric, underscore, hyphen
const VALID_PROVIDER_REGEX = /^[a-z0-9_-]{1,32}$/;

// Valid tag pattern: alphanumeric with spaces, max 32 chars
const VALID_TAG_REGEX = /^[a-zA-Z0-9_- ]{1,32}$/;

// ISO 8601 date pattern
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// Relative expiry patterns
const RELATIVE_EXPIRY_REGEX = /^(\d+)([dmy])$/;

/**
 * Validate secret name
 * @param {string} name - Name to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateSecretName(name) {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Name is required' };
  }
  
  if (name.length > 64) {
    return { valid: false, error: 'Name cannot exceed 64 characters' };
  }
  
  if (!VALID_NAME_REGEX.test(name)) {
    return { valid: false, error: 'Name must contain only alphanumeric, underscore, or hyphen characters' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate provider name
 * @param {string} provider - Provider to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateProvider(provider) {
  if (!provider) {
    return { valid: true, error: null }; // Provider is optional
  }
  
  if (provider.length > 32) {
    return { valid: false, error: 'Provider cannot exceed 32 characters' };
  }
  
  if (!VALID_PROVIDER_REGEX.test(provider)) {
    return { valid: false, error: 'Provider must be lowercase alphanumeric, underscore, or hyphen' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate secret value
 * @param {string} value - Value to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateSecretValue(value) {
  if (!value || value.length === 0) {
    return { valid: false, error: 'Secret value cannot be empty' };
  }
  
  if (value.length > 10000) {
    return { valid: false, error: 'Secret value cannot exceed 10,000 characters' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate tag
 * @param {string} tag - Tag to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateTag(tag) {
  if (!tag || tag.length === 0) {
    return { valid: false, error: 'Tag cannot be empty' };
  }
  
  if (tag.length > 32) {
    return { valid: false, error: 'Tag cannot exceed 32 characters' };
  }
  
  if (!VALID_TAG_REGEX.test(tag)) {
    return { valid: false, error: 'Tag contains invalid characters' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate expiry string
 * @param {string} expiry - Expiry string to validate
 * @returns {object} - { valid: boolean, error: string|null, date: Date|null }
 */
export function validateExpiry(expiry) {
  if (!expiry) {
    return { valid: true, error: null, date: null };
  }
  
  // Check relative format (90d, 6m, 1y)
  const relativeMatch = expiry.match(RELATIVE_EXPIRY_REGEX);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];
    
    if (amount <= 0) {
      return { valid: false, error: 'Expiry amount must be positive', date: null };
    }
    
    const date = new Date();
    switch (unit) {
      case 'd':
        date.setDate(date.getDate() + amount);
        break;
      case 'm':
        date.setMonth(date.getMonth() + amount);
        break;
      case 'y':
        date.setFullYear(date.getFullYear() + amount);
        break;
    }
    
    return { valid: true, error: null, date };
  }
  
  // Check ISO date format
  const date = new Date(expiry);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format. Use 90d, 6m, 1y, or ISO date', date: null };
  }
  
  // Check if date is in the future
  if (date <= new Date()) {
    return { valid: false, error: 'Expiry date must be in the future', date: null };
  }
  
  return { valid: true, error: null, date };
}

/**
 * Validate master password
 * @param {string} password - Password to validate
 * @param {object} options - Validation options
 * @returns {object} - { valid: boolean, error: string|null, strength: string }
 */
export function validateMasterPassword(password, options = {}) {
  const minLength = options.minLength || 8;
  const requireUppercase = options.requireUppercase !== false;
  const requireLowercase = options.requireLowercase !== false;
  const requireNumbers = options.requireNumbers !== false;
  const requireSpecial = options.requireSpecial !== false;
  
  if (!password || password.length === 0) {
    return { valid: false, error: 'Password is required', strength: 'none' };
  }
  
  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters`, strength: 'weak' };
  }
  
  let strength = 0;
  
  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  
  const strengthLabel = strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong';
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain uppercase letters', strength: strengthLabel };
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain lowercase letters', strength: strengthLabel };
  }
  
  if (requireNumbers && !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain numbers', strength: strengthLabel };
  }
  
  if (requireSpecial && !/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain special characters', strength: strengthLabel };
  }
  
  return { valid: true, error: null, strength: strengthLabel };
}

/**
 * Validate namespace name
 * @param {string} namespace - Namespace to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateNamespace(namespace) {
  return validateSecretName(namespace);
}

/**
 * Validate environment name
 * @param {string} environment - Environment to validate
 * @returns {object} - { valid: boolean, error: string|null }
 */
export function validateEnvironment(environment) {
  return validateSecretName(environment);
}

/**
 * Sanitize string for safe storage
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(str) {
  if (!str) return str;
  
  // Normalize Unicode to prevent spoofing
  return str.normalize('NFKC').trim();
}

/**
 * Check if string is valid JSON
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if value is a valid base64 string
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isValidBase64(str) {
  if (!str) return false;
  
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch {
    return false;
  }
}

/**
 * Validate email format (for notifications)
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
