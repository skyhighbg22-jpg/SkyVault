import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSessionToken, sha256Base64 } from './crypto.js';

const SESSION_DIR = process.platform === 'win32' 
  ? path.join(os.tmpdir(), 'skyvault')
  : '/tmp';

const SESSION_TIMEOUT_MINUTES = 15;

// Ensure session directory exists on Windows
if (process.platform === 'win32' && !fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

function getSessionFile() {
  const uid = process.getuid ? process.getuid() : process.pid;
  return path.join(SESSION_DIR, `skyvault-${uid}.session`);
}

/**
 * Create a new session
 * @param {Buffer} masterKey - The derived master key
 * @param {number} ttlMinutes - Session timeout in minutes (default: 15)
 * @returns {string} - Session token
 */
export function createSession(masterKey, ttlMinutes = SESSION_TIMEOUT_MINUTES) {
  const sessionFile = getSessionFile();
  const token = generateSessionToken();
  const expires = Date.now() + (ttlMinutes * 60 * 1000);
  
  // Store session data (key is hashed for security)
  const sessionData = {
    token: sha256Base64(token), // Hash the token for storage
    keyHash: sha256Base64(masterKey.toString('base64')), // Hash of key for verification
    expires: expires,
    created: Date.now()
  };
  
  // Write session file with restricted permissions
  fs.writeFileSync(sessionFile, JSON.stringify(sessionData), { mode: 0o600 });
  
  // Store the actual key in memory only (global scope)
  if (!global.skyvaultSessions) {
    global.skyvaultSessions = new Map();
  }
  global.skyvaultSessions.set(token, {
    key: masterKey,
    expires: expires
  });
  
  return token;
}

/**
 * Validate and retrieve session
 * @param {string} token - Session token
 * @returns {Buffer|null} - Master key if valid, null otherwise
 */
export function validateSession(token) {
  // Check in-memory cache first
  if (global.skyvaultSessions && global.skyvaultSessions.has(token)) {
    const session = global.skyvaultSessions.get(token);
    if (Date.now() < session.expires) {
      return session.key;
    } else {
      // Expired, remove from memory
      global.skyvaultSessions.delete(token);
    }
  }
  
  // Check session file
  const sessionFile = getSessionFile();
  if (!fs.existsSync(sessionFile)) {
    return null;
  }
  
  try {
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    
    // Check if expired
    if (Date.now() > sessionData.expires) {
      // Clean up expired session
      destroySession();
      return null;
    }
    
    // Verify token hash
    const tokenHash = sha256Base64(token);
    if (tokenHash !== sessionData.token) {
      return null;
    }
    
    // Session is valid but key not in memory - need re-authentication
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if a valid session exists
 * @returns {boolean}
 */
export function hasSession() {
  const sessionFile = getSessionFile();
  if (!fs.existsSync(sessionFile)) {
    return false;
  }
  
  try {
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    return Date.now() < sessionData.expires;
  } catch {
    return false;
  }
}

/**
 * Destroy current session
 */
export function destroySession() {
  const sessionFile = getSessionFile();
  
  // Clear in-memory sessions
  if (global.skyvaultSessions) {
    // Zero out keys before clearing
    for (const [token, session] of global.skyvaultSessions) {
      if (session.key) {
        session.key.fill(0);
      }
    }
    global.skyvaultSessions.clear();
  }
  
  // Remove session file
  if (fs.existsSync(sessionFile)) {
    try {
      fs.unlinkSync(sessionFile);
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Get session info
 * @returns {Object|null} - Session info or null
 */
export function getSessionInfo() {
  const sessionFile = getSessionFile();
  if (!fs.existsSync(sessionFile)) {
    return null;
  }
  
  try {
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    const remaining = Math.max(0, Math.floor((sessionData.expires - Date.now()) / 1000));
    
    return {
      created: new Date(sessionData.created).toISOString(),
      expires: new Date(sessionData.expires).toISOString(),
      remainingSeconds: remaining
    };
  } catch {
    return null;
  }
}

/**
 * Extend session timeout
 * @param {number} additionalMinutes - Minutes to add
 */
export function extendSession(additionalMinutes = SESSION_TIMEOUT_MINUTES) {
  const sessionFile = getSessionFile();
  if (!fs.existsSync(sessionFile)) {
    return false;
  }
  
  try {
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    sessionData.expires = Date.now() + (additionalMinutes * 60 * 1000);
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData), { mode: 0o600 });
    
    // Update in-memory sessions
    if (global.skyvaultSessions) {
      for (const [token, session] of global.skyvaultSessions) {
        session.expires = sessionData.expires;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}
