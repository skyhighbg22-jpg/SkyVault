import chalk from 'chalk';
import Table from 'cli-table3';

// Check if colors should be disabled
let colorsEnabled = true;

export function disableColors() {
  colorsEnabled = false;
  chalk.level = 0;
}

// Success message
export function success(msg) {
  if (colorsEnabled) {
    console.log(chalk.green('✓'), msg);
  } else {
    console.log('[OK]', msg);
  }
}

// Error message
export function error(msg) {
  if (colorsEnabled) {
    console.error(chalk.red('✗'), msg);
  } else {
    console.error('[ERROR]', msg);
  }
}

// Warning message
export function warning(msg) {
  if (colorsEnabled) {
    console.log(chalk.yellow('⚠'), msg);
  } else {
    console.log('[WARN]', msg);
  }
}

// Info message
export function info(msg) {
  if (colorsEnabled) {
    console.log(chalk.dim(msg));
  } else {
    console.log(msg);
  }
}

// Mask a secret value
export function masked(value, style = 'stars') {
  if (!value || value.length === 0) {
    return '***';
  }
  
  if (value.length <= 6) {
    return '***';
  }
  
  const first = value.slice(0, 3);
  const last = value.slice(-3);
  const middle = '•'.repeat(Math.min(value.length - 6, 10));
  
  if (colorsEnabled) {
    return chalk.dim(`${first}${middle}${last}`);
  }
  return `${first}${middle}${last}`;
}

// Scramble mask (random characters)
export function scrambleMask(value) {
  if (!value || value.length === 0) {
    return '***';
  }
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < value.length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Create a table
export function createTable(headers) {
  return new Table({
    head: headers.map(h => colorsEnabled ? chalk.bold(h) : h),
    style: {
      head: [],
      border: []
    }
  });
}

// Print table
export function printTable(table) {
  console.log(table.toString());
}

// Print JSON output
export function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

// Print raw value
export function printRaw(value) {
  console.log(value);
}

// Print header
export function header(text) {
  if (colorsEnabled) {
    console.log(chalk.bold.cyan(`\n${text}\n`));
  } else {
    console.log(`\n${text}\n`);
  }
}

// Print separator
export function separator() {
  console.log('-'.repeat(60));
}

// Helpful error with suggestion
export function notFoundError(name, suggestions = []) {
  error(`Secret '${name}' not found.`);
  
  if (suggestions.length > 0) {
    console.log('\nDid you mean:');
    suggestions.forEach(s => console.log(`  • ${s}`));
  }
}

// Format date
export function formatDate(isoDate) {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleDateString();
}

// Check if expired
export function isExpired(expires) {
  if (!expires) return false;
  return new Date(expires) < new Date();
}

// Format expiry with color
export function formatExpiry(expires) {
  if (!expires) {
    return colorsEnabled ? chalk.dim('-') : '-';
  }
  
  const date = new Date(expires);
  const now = new Date();
  const daysUntil = Math.floor((date - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) {
    return colorsEnabled ? chalk.red('EXPIRED') : 'EXPIRED';
  } else if (daysUntil < 7) {
    return colorsEnabled ? chalk.yellow(`${daysUntil}d`) : `${daysUntil}d`;
  }
  
  return colorsEnabled ? chalk.green(formatDate(expires)) : formatDate(expires);
}

// Quiet mode flag
let quietMode = false;

export function setQuiet(quiet) {
  quietMode = quiet;
}

export function isQuiet() {
  return quietMode;
}

// Conditional logging
export function log(...args) {
  if (!quietMode) {
    console.log(...args);
  }
}

export function logError(...args) {
  console.error(...args);
}
