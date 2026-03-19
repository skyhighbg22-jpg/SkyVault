import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { deriveKey, encrypt, decrypt, generateSalt, computeHMAC, verifyHMAC } from './crypto.js';

const VAULT_DIR = path.join(os.homedir(), '.skyvault');
const VAULT_FILE = path.join(VAULT_DIR, 'vault.json');
const LOCK_FILE = VAULT_FILE + '.lock';

const CURRENT_SCHEMA_VERSION = 2;

// Ensure vault directory exists
function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    try {
      fs.chmodSync(VAULT_DIR, 0o700);
    } catch (e) {
      // Ignore on Windows
    }
  }
}

/**
 * Initialize a new encrypted vault
 * @param {string} masterPassword - User's master password
 * @returns {Promise<Object>} - Vault header with salt
 */
export async function initVault(masterPassword) {
  ensureVaultDir();
  
  const salt = generateSalt();
  const key = await deriveKey(masterPassword, salt);
  
  const vault = {
    _header: {
      schema_version: CURRENT_SCHEMA_VERSION,
      kdf: 'pbkdf2',
      kdf_params: {
        iterations: 600000,
        hash: 'sha512',
        keyLen: 32
      },
      salt: salt.toString('base64'),
      hmac: '', // Will be computed after encryption
      created: new Date().toISOString()
    },
    namespaces: {}
  };
  
  // Compute initial HMAC (empty vault)
  const ciphertextData = JSON.stringify(vault.namespaces);
  vault._header.hmac = computeHMAC(ciphertextData, key);
  
  // Save vault
  await saveVaultInternal(vault);
  
  return {
    vault,
    key
  };
}

/**
 * Load vault from disk and verify integrity
 * @param {string} masterPassword - User's master password
 * @returns {Promise<Object>} - { vault, key }
 * @throws {Error} - If vault doesn't exist, password is wrong, or integrity check fails
 */
export async function loadVault(masterPassword) {
  ensureVaultDir();
  
  if (!fs.existsSync(VAULT_FILE)) {
    throw new Error('Vault not initialized. Run "skv vault init" first.');
  }
  
  const vaultData = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
  
  // Check schema version
  if (!vaultData._header) {
    throw new Error('Vault file is corrupted (no header)');
  }
  
  const header = vaultData._header;
  
  // Validate schema version
  if (header.schema_version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Vault schema version ${header.schema_version} is newer than supported (${CURRENT_SCHEMA_VERSION}). Please upgrade SkyVault.`);
  }
  
  // Derive key
  const salt = Buffer.from(header.salt, 'base64');
  const key = await deriveKey(masterPassword, salt);
  
  // Verify HMAC
  const ciphertextData = JSON.stringify(vaultData.namespaces);
  if (!verifyHMAC(ciphertextData, header.hmac, key)) {
    throw new Error('Vault integrity check failed. The vault file may be corrupted or the password is incorrect.');
  }
  
  // Decrypt all secret values
  const decryptedVault = {
    ...vaultData,
    namespaces: {}
  };
  
  for (const [nsName, ns] of Object.entries(vaultData.namespaces)) {
    decryptedVault.namespaces[nsName] = {};
    for (const [envName, env] of Object.entries(ns)) {
      decryptedVault.namespaces[nsName][envName] = {};
      for (const [secretName, secret] of Object.entries(env)) {
        // Decrypt the secret value
        try {
          const plaintext = decrypt(
            secret.ciphertext,
            secret.iv,
            secret.authTag,
            key
          );
          
          decryptedVault.namespaces[nsName][envName][secretName] = {
            ...secret,
            value: plaintext
          };
        } catch (e) {
          throw new Error(`Failed to decrypt secret '${secretName}': ${e.message}`);
        }
      }
    }
  }
  
  return {
    vault: decryptedVault,
    key
  };
}

/**
 * Save vault to disk with encryption
 * @param {Object} vault - Decrypted vault data
 * @param {Buffer} key - Encryption key
 * @returns {Promise<void>}
 */
export async function saveVault(vault, key) {
  // Encrypt all secret values
  const encryptedVault = {
    _header: vault._header,
    namespaces: {}
  };
  
  for (const [nsName, ns] of Object.entries(vault.namespaces)) {
    encryptedVault.namespaces[nsName] = {};
    for (const [envName, env] of Object.entries(ns)) {
      encryptedVault.namespaces[nsName][envName] = {};
      for (const [secretName, secret] of Object.entries(env)) {
        // Encrypt the secret value
        const encrypted = encrypt(secret.value, key);
        
        encryptedVault.namespaces[nsName][envName][secretName] = {
          ...secret,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag
        };
        
        // Remove plaintext value
        delete encryptedVault.namespaces[nsName][envName][secretName].value;
      }
    }
  }
  
  // Compute HMAC
  const ciphertextData = JSON.stringify(encryptedVault.namespaces);
  encryptedVault._header.hmac = computeHMAC(ciphertextData, key);
  encryptedVault._header.updated = new Date().toISOString();
  
  await saveVaultInternal(encryptedVault);
}

/**
 * Internal save function (atomic write)
 * @param {Object} vault - Vault data to save
 */
async function saveVaultInternal(vault) {
  ensureVaultDir();
  
  const tmpFile = VAULT_FILE + '.tmp';
  
  try {
    // Write to temp file
    fs.writeFileSync(tmpFile, JSON.stringify(vault, null, 2));
    
    // Set permissions (Unix only)
    try {
      fs.chmodSync(tmpFile, 0o600);
    } catch (e) {
      // Ignore on Windows
    }
    
    // Atomic rename
    fs.renameSync(tmpFile, VAULT_FILE);
  } catch (e) {
    // Clean up temp file
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
    throw e;
  }
}

/**
 * Acquire advisory lock
 * @returns {boolean} - True if lock acquired
 */
export function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
      try {
        process.kill(pid, 0);
        return false; // Process still running
      } catch (e) {
        // Stale lock
      }
    } catch (e) {
      // Corrupt lock file
    }
  }
  
  fs.writeFileSync(LOCK_FILE, process.pid.toString());
  return true;
}

/**
 * Release advisory lock
 */
export function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Check if vault exists
 * @returns {boolean}
 */
export function vaultExists() {
  return fs.existsSync(VAULT_FILE);
}

/**
 * Check if vault is locked
 * @returns {boolean}
 */
export function isLocked() {
  if (!fs.existsSync(LOCK_FILE)) {
    return false;
  }
  
  try {
    const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'));
    try {
      process.kill(pid, 0);
      return true; // Process still running
    } catch {
      return false; // Stale lock
    }
  } catch {
    return false;
  }
}

export { VAULT_DIR, VAULT_FILE };
