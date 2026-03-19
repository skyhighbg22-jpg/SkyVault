/**
 * Formatting utilities for SkyVault
 */

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted size
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Seconds to format
 * @returns {string} - Formatted duration
 */
export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format relative time
 * @param {Date|string} date - Date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const target = new Date(date);
  const diff = now - target;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) {
    return seconds <= 5 ? 'just now' : `${seconds}s ago`;
  }
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  if (days < 30) {
    return `${days}d ago`;
  }
  
  return target.toLocaleDateString();
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated string
 */
export function truncate(str, maxLength = 50) {
  if (!str || str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Wrap text at specified width
 * @param {string} text - Text to wrap
 * @param {number} width - Width to wrap at
 * @returns {string[]} - Array of wrapped lines
 */
export function wrapText(text, width = 80) {
  if (!text) return [];
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length > width) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines;
}

/**
 * Convert string to slug
 * @param {string} str - String to convert
 * @returns {string} - Slug
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert camelCase to kebab-case
 * @param {string} str - String to convert
 * @returns {string} - Converted string
 */
export function camelToKebab(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 * @param {string} str - String to convert
 * @returns {string} - Converted string
 */
export function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert to environment variable format
 * @param {string} str - String to convert
 * @returns {string} - Uppercase with underscores
 */
export function toEnvVar(str) {
  return str
    .replace(/[-\s]/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

/**
 * Pad string to fixed width
 * @param {string} str - String to pad
 * @param {number} width - Target width
 * @param {string} char - Padding character
 * @returns {string} - Padded string
 */
export function padRight(str, width, char = ' ') {
  return String(str).padEnd(width, char);
}

/**
 * Pad string to fixed width (left)
 * @param {string} str - String to pad
 * @param {number} width - Target width
 * @param {string} char - Padding character
 * @returns {string} - Padded string
 */
export function padLeft(str, width, char = ' ') {
  return String(str).padStart(width, char);
}

/**
 * Strip ANSI escape codes
 * @param {string} str - String with ANSI codes
 * @returns {string} - Clean string
 */
export function stripAnsi(str) {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Calculate visible length (excluding ANSI codes)
 * @param {string} str - String to measure
 * @returns {number} - Visible length
 */
export function visibleLength(str) {
  return stripAnsi(str).length;
}

/**
 * Format JSON with indentation
 * @param {object} obj - Object to format
 * @param {number} indent - Indentation spaces
 * @returns {string} - Formatted JSON
 */
export function formatJson(obj, indent = 2) {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return String(obj);
  }
}

/**
 * Format list with commas and 'and'
 * @param {string[]} items - Items to format
 * @returns {string} - Formatted list
 */
export function formatList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/**
 * Pluralize word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional)
 * @returns {string} - Pluralized word
 */
export function pluralize(count, singular, plural = null) {
  const word = count === 1 ? singular : (plural || singular + 's');
  return `${count} ${word}`;
}
