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

// Helpful error with suggestions and context
export function notFoundError(name, suggestions = [], context = {}) {
  error(`Secret '${name}' not found.`);

  if (suggestions.length > 0) {
    console.log('\n💡 Did you mean:');
    suggestions.forEach(s => console.log(`  • ${s}`));
  }

  // Context-specific hints
  if (context.missingSession) {
    console.log('\n🔓 Hint: Run "skv vault unlock" first to access your secrets');
  }

  if (context.wrongNamespace) {
    console.log(`\n📁 Current namespace: ${context.ns || 'default'}`);
    console.log('   Use --ns <namespace> to specify a different namespace');
  }

  if (context.wrongEnv) {
    console.log(`\n🌍 Current environment: ${context.env || 'dev'}`);
    console.log('   Use --env <environment> to specify a different environment');
  }

  if (context.listCommand) {
    console.log('\n📋 Run "skv list" to see all available secrets');
  }
}

// Auth-related errors
export function authError(message, context = {}) {
  error(`Authentication failed: ${message}`);

  if (context.locked) {
    console.log('\n🔐 Your vault is locked');
    console.log('   Run "skv vault unlock" to access your secrets');
  }

  if (context.wrongPassword) {
    console.log('\n💡 Hint: Check your master password and try again');
    console.log('   Use "skv vault set-password" to change your password');
  }
}

// Validation errors with helpful hints
export function validationError(field, message, hints = []) {
  error(`Invalid ${field}: ${message}`);

  if (hints.length > 0) {
    console.log('\n💡 Tips:');
    hints.forEach(h => console.log(`   • ${h}`));
  }
}

// Vault errors
export function vaultError(message, context = {}) {
  error(`Vault error: ${message}`);

  if (context.notInitialized) {
    console.log('\n🚀 Getting started:');
    console.log('   Run "skv vault init" to create your encrypted vault');
  }

  if (context.corrupted) {
    console.log('\n🔧 Possible solutions:');
    console.log('   • Try restoring from a backup: skv backup list');
    console.log('   • Check vault file integrity manually');
  }
}

// Command not found / typo suggestion
export function commandError(input, suggestions = []) {
  error(`Unknown command: ${input}`);

  if (suggestions.length > 0) {
    console.log('\n💡 Did you mean:');
    suggestions.forEach(s => console.log(`   skv ${s}`));
  }

  console.log('\n📖 Run "skv --help" to see available commands');
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
