import crypto from 'crypto';
import { promisify } from 'util';

// PBKDF2 parameters
const PBKDF2_ITERATIONS = 600000; // OWASP recommended
const PBKDF2_KEYLEN = 32; // 256 bits
const PBKDF2_DIGEST = 'sha512';

// AES-GCM parameters
const AES_ALGORITHM = 'aes-256-gcm';
const AES_IV_LENGTH = 12; // 96 bits for GCM
const AES_TAG_LENGTH = 16; // 128 bits

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - Master password
 * @param {Buffer} salt - Random salt (32 bytes)
 * @returns {Promise<Buffer>} - 32-byte derived key
 */
export async function deriveKey(password, salt) {
  const pbkdf2 = promisify(crypto.pbkdf2);
  return pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
}

/**
 * Synchronous key derivation (for fallback)
 * @param {string} password - Master password
 * @param {Buffer} salt - Random salt
 * @returns {Buffer} - 32-byte derived key
 */
export function deriveKeySync(password, salt) {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param {string} plaintext - Secret value to encrypt
 * @param {Buffer} key - 32-byte encryption key
 * @returns {Object} - { ciphertext: base64, iv: base64, authTag: base64 }
 */
export function encrypt(plaintext, key) {
  // Generate random IV
  const iv = crypto.randomBytes(AES_IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
  
  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  return {
    ciphertext: ciphertext,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} iv - Base64 encoded IV
 * @param {string} authTag - Base64 encoded authentication tag
 * @param {Buffer} key - 32-byte decryption key
 * @returns {string} - Decrypted plaintext
 * @throws {Error} - If decryption fails (wrong key or tampered data)
 */
export function decrypt(ciphertext, iv, authTag, key) {
  try {
    // Create decipher
    const decipher = crypto.createDecipheriv(
      AES_ALGORITHM,
      key,
      Buffer.from(iv, 'base64')
    );
    
    // CRITICAL: Set auth tag BEFORE final()
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    // Decrypt
    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (e) {
    throw new Error('Decryption failed: invalid password or corrupted data');
  }
}

/**
 * Generate a random salt for key derivation
 * @returns {Buffer} - 32-byte random salt
 */
export function generateSalt() {
  return crypto.randomBytes(32);
}

/**
 * Generate a random session token
 * @returns {string} - Base64 encoded 256-bit token
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Compute HMAC-SHA256 for integrity checking
 * @param {string} data - Data to hash
 * @param {Buffer} key - HMAC key
 * @returns {string} - Base64 encoded HMAC
 */
export function computeHMAC(data, key) {
  return crypto.createHmac('sha256', key).update(data).digest('base64');
}

/**
 * Verify HMAC-SHA256
 * @param {string} data - Data to verify
 * @param {string} hmac - Expected HMAC (base64)
 * @param {Buffer} key - HMAC key
 * @returns {boolean} - True if HMAC matches
 */
export function verifyHMAC(data, hmac, key) {
  const computed = computeHMAC(data, key);
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
  } catch {
    return false;
  }
}

/**
 * Generate secure random bytes
 * @param {number} length - Number of bytes
 * @returns {Buffer} - Random bytes
 */
export function randomBytes(length) {
  return crypto.randomBytes(length);
}

/**
 * Hash a string using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - Hex encoded hash
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash a string using SHA-256 (base64)
 * @param {string} data - Data to hash
 * @returns {string} - Base64 encoded hash
 */
export function sha256Base64(data) {
  return crypto.createHash('sha256').update(data).digest('base64');
}
