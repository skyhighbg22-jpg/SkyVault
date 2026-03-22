import crypto from 'crypto';

// Simple in-memory rate limiting for share decryption attempts
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_MAX_ENTRIES = 1000; // Prevent memory leak

/**
 * Clean up expired rate limit entries to prevent memory leak
 */
function cleanupRateLimitStore() {
    const now = Date.now();
    let deleted = 0;

    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetAt) {
            rateLimitStore.delete(key);
            deleted++;
        }
    }

    // If still over limit, clear oldest entries
    if (rateLimitStore.size > RATE_LIMIT_MAX_ENTRIES) {
        const entriesToDelete = rateLimitStore.size - RATE_LIMIT_MAX_ENTRIES + 100;
        let deletedCount = 0;
        for (const [key] of rateLimitStore.entries()) {
            if (deletedCount >= entriesToDelete) break;
            rateLimitStore.delete(key);
            deletedCount++;
        }
    }
}

/**
 * Check and update rate limit for a share code
 * @param {string} shareCode - The share code to check
 * @returns {boolean} True if allowed, false if rate limited
 */
function checkRateLimit(shareCode) {
    // Cleanup periodically to prevent memory leak
    if (rateLimitStore.size > 50) {
        cleanupRateLimitStore();
    }

    const now = Date.now();
    // Use SHA-256 hash truncated to 16 chars to avoid prefix collisions
    const hash = crypto.createHash('sha256').update(shareCode).digest('hex');
    const key = hash.substring(0, 16);

    const record = rateLimitStore.get(key);

    if (!record) {
        rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    // Reset if window expired
    if (now > record.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    // Check limit
    if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
        return false;
    }

    record.count++;
    return true;
}

/**
 * Derive encryption key from password using PBKDF2 (async)
 * @param {string} password - The password to derive from
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Promise<Buffer>} Derived key
 */
function deriveKeyAsync(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 32, 'sha512', (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });
}

/**
 * Parse expiry string to Date
 * @param {string} input - Expiry like "1h", "24h", "7d"
 * @returns {Date|null} Expiration date or null
 */
function parseExpiry(input) {
    if (!input) return null;

    const now = new Date();

    if (/^\d+h$/.test(input)) {
        const hours = parseInt(input);
        now.setHours(now.getHours() + hours);
        return now;
    }

    if (/^\d+d$/.test(input)) {
        const days = parseInt(input);
        now.setDate(now.getDate() + days);
        return now;
    }

    return null;
}

/**
 * Encrypt a secret for sharing
 * @param {Object} secretData - The secret object to encrypt
 * @param {string} sharePassword - Password for encryption
 * @param {Object} options - Options like expires
 * @param {string} options.expires - Expiration like "1h", "24h", "7d"
 * @returns {Object} Encrypted share data
 */
export async function createShare(secretData, sharePassword, options = {}) {
    // Generate random salt and IV
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    // Derive key from password using async to avoid blocking CLI
    const key = await deriveKeyAsync(sharePassword, salt);

    // Create authenticated encryption
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // Parse expiration
    const expiresAt = parseExpiry(options.expires);

    // Serialize secret data
    const data = JSON.stringify({
        name: secretData.name,
        value: secretData.value,
        type: secretData.type,
        provider: secretData.provider,
        description: secretData.description,
        created: new Date().toISOString(),
        expires: expiresAt ? expiresAt.toISOString() : null
    });

    // Encrypt
    const encrypted = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Generate share code (base64 encoded)
    const shareCode = Buffer.concat([salt, iv, authTag, encrypted]).toString('base64url');

    return {
        shareCode,
        expires: expiresAt ? expiresAt.toISOString() : null
    };
}

/**
 * Decrypt a shared secret
 * @param {string} shareCode - The share code
 * @param {string} sharePassword - Password for decryption
 * @returns {Object} Decrypted secret data
 */
export async function receiveShare(shareCode, sharePassword) {
    // Check rate limit FIRST, before any processing to prevent resource exhaustion
    if (!checkRateLimit(shareCode)) {
        throw new Error('Too many failed attempts. Please wait before trying again.');
    }

    // Validate shareCode format before attempting to decode
    if (!shareCode || typeof shareCode !== 'string' || shareCode.length < 10) {
        throw new Error('Invalid share code: must be a non-empty string');
    }

    // Decode share code
    let buffer;
    try {
        buffer = Buffer.from(shareCode, 'base64url');
    } catch (e) {
        throw new Error('Invalid share code: could not decode');
    }

    // Validate minimum length: 32 (salt) + 12 (iv) + 16 (authTag) + 1 (min encrypted) = 61
    if (buffer.length < 61) {
        throw new Error('Invalid share code: too short or corrupted');
    }

    // Extract components
    const salt = buffer.subarray(0, 32);
    const iv = buffer.subarray(32, 44);
    const authTag = buffer.subarray(44, 60);
    const encrypted = buffer.subarray(60);

    // Derive key from password using async to avoid blocking CLI
    const key = await deriveKeyAsync(sharePassword, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted;
    try {
        decrypted = decipher.update(encrypted) + decipher.final('utf8');
    } catch (e) {
        throw new Error('Invalid password or corrupted share');
    }

    // Parse JSON
    const secretData = JSON.parse(decrypted);

    // Check expiration
    if (secretData.expires) {
        const expiresAt = new Date(secretData.expires);
        if (expiresAt < new Date()) {
            throw new Error('This share has expired and can no longer be accessed');
        }
    }

    return secretData;
}

/**
 * Generate a short share link
 * @param {string} shareCode - The full share code
 * @returns {string} Short share URL
 */
export function createShareLink(shareCode) {
    return `skv://share/${shareCode}`;
}

/**
 * Parse a share link
 * @param {string} link - The share link
 * @returns {string|null} Share code or null if invalid
 */
export function parseShareLink(link) {
    if (link.startsWith('skv://share/')) {
        return link.replace('skv://share/', '');
    }
    return null;
}
