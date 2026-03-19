import { loadVault, saveVault, vaultExists, acquireLock, releaseLock } from './encrypted-vault.js';
import { hasSession, validateSession, destroySession } from './session.js';
import { error } from '../ui/output.js';

// Global key storage (in memory only)
let currentKey = null;

/**
 * Check if vault is accessible
 * @returns {boolean}
 */
export function isVaultReady() {
  return vaultExists() && hasSession();
}

/**
 * Require vault to be unlocked
 * @throws {Error} if vault is locked
 */
export function requireVault() {
  if (!vaultExists()) {
    throw new Error('Vault not initialized. Run "skv vault init" first.');
  }
  
  if (!hasSession()) {
    throw new Error('Vault is locked. Run "skv vault unlock" first.');
  }
  
  return true;
}

/**
 * Load vault with automatic session check
 * @returns {Promise<Object>} - { vault, key }
 */
export async function loadVaultWithSession() {
  requireVault();
  
  // Try to get key from session
  const key = validateSession('dummy-token'); // Session validation needed here
  
  if (!key) {
    // Need to re-authenticate
    throw new Error('Session expired. Run "skv vault unlock" to re-authenticate.');
  }
  
  // Acquire lock
  if (!acquireLock()) {
    throw new Error('Vault is locked by another process. Please wait and try again.');
  }
  
  try {
    const result = await loadVault(''); // Password not needed, key already in session
    return result;
  } finally {
    releaseLock();
  }
}

/**
 * Save vault with automatic encryption
 * @param {Object} vault - Decrypted vault data
 * @param {Buffer} key - Encryption key
 */
export async function saveVaultWithSession(vault, key) {
  // Acquire lock
  if (!acquireLock()) {
    throw new Error('Vault is locked by another process. Please wait and try again.');
  }
  
  try {
    await saveVault(vault, key);
  } finally {
    releaseLock();
  }
}

/**
 * Store key in global session (called after unlock)
 * @param {Buffer} key - Encryption key
 */
export function storeKey(key) {
  currentKey = key;
}

/**
 * Get stored key
 * @returns {Buffer|null}
 */
export function getStoredKey() {
  return currentKey;
}

/**
 * Clear stored key
 */
export function clearKey() {
  if (currentKey) {
    currentKey.fill(0); // Zero out for security
    currentKey = null;
  }
}

// Register cleanup on exit
process.on('exit', () => {
  clearKey();
});

process.on('SIGINT', () => {
  clearKey();
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearKey();
  process.exit(0);
});
