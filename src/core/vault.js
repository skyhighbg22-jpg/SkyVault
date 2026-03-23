import fs from 'fs';
import path from 'path';
import os from 'os';
import Fuse from 'fuse.js';

const VAULT_DIR = path.join(os.homedir(), '.skyvault');
const VAULT_FILE = path.join(VAULT_DIR, 'vault.json');

// Ensure vault directory exists
function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    // Set permissions to 700 (rwx------) on Unix systems
    try {
      fs.chmodSync(VAULT_DIR, 0o700);
    } catch (e) {
      // Ignore on Windows
    }
  }
}

// Load vault data from disk
export function loadVault() {
  ensureVaultDir();

  if (!fs.existsSync(VAULT_FILE)) {
    return { namespaces: {} };
  }

  try {
    const data = fs.readFileSync(VAULT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    throw new Error(`Failed to load vault: ${e.message}`);
  }
}

// Save vault data to disk (atomic write)
export function saveVault(vault) {
  ensureVaultDir();

  const tmpFile = VAULT_FILE + '.tmp';

  try {
    // Write to temp file first
    fs.writeFileSync(tmpFile, JSON.stringify(vault, null, 2), { mode: 0o600 });

    // Atomic rename
    fs.renameSync(tmpFile, VAULT_FILE);

    // Set permissions on Unix
    try {
      fs.chmodSync(VAULT_FILE, 0o600);
    } catch (e) {
      // Ignore on Windows
    }
  } catch (e) {
    // Clean up temp file if it exists
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
    throw new Error(`Failed to save vault: ${e.message}`);
  }
}

// Get a namespace and environment
export function getNamespace(vault, ns, env) {
  if (!vault.namespaces[ns]) {
    vault.namespaces[ns] = {};
  }
  if (!vault.namespaces[ns][env]) {
    vault.namespaces[ns][env] = {};
  }
  return vault.namespaces[ns][env];
}

// Get a secret by name
export function getSecret(vault, ns, env, name) {
  const namespace = vault.namespaces[ns];
  if (!namespace) return null;

  const environment = namespace[env];
  if (!environment) return null;

  return environment[name] || null;
}

// Set a secret
export function setSecret(vault, ns, env, name, secretData) {
  const environment = getNamespace(vault, ns, env);

  const now = new Date().toISOString();

  environment[name] = {
    ...secretData,
    created: environment[name]?.created || now,
    updated: now
  };
}

// Delete a secret
export function deleteSecret(vault, ns, env, name) {
  const namespace = vault.namespaces[ns];
  if (!namespace) return false;

  const environment = namespace[env];
  if (!environment) return false;

  if (environment[name]) {
    delete environment[name];
    return true;
  }
  return false;
}

// List all secrets
export function listSecrets(vault, ns, env) {
  const namespace = vault.namespaces[ns];
  if (!namespace) return [];

  const environment = namespace[env];
  if (!environment) return [];

  return Object.entries(environment).map(([name, data]) => ({
    name,
    ...data
  }));
}

// Find secrets across all namespaces/environments
export function findSecrets(vault, query) {
  const results = [];

  for (const [ns, namespaces] of Object.entries(vault.namespaces)) {
    for (const [env, environment] of Object.entries(namespaces)) {
      for (const [name, data] of Object.entries(environment)) {
        if (name.toLowerCase().includes(query.toLowerCase()) ||
          (data.provider && data.provider.toLowerCase().includes(query.toLowerCase())) ||
          (data.tags && data.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))) {
          results.push({
            name,
            ns,
            env,
            ...data
          });
        }
      }
    }
  }

  return results;
}

// Fuzzy search secrets across all namespaces/environments using fuse.js
export function fuzzyFindSecrets(vault, query, options = {}) {
  const { threshold = 0.4, limit = 50 } = options;

  // Validate query input
  if (!query || !query.trim()) {
    return [];
  }

  // Validate and bounds-check options
  const validThreshold = Math.max(0, Math.min(1, threshold));
  const validLimit = Math.max(1, Math.min(1000, limit));

  // Build flat array of all secrets
  const allSecrets = [];

  for (const [ns, namespaces] of Object.entries(vault.namespaces)) {
    for (const [env, environment] of Object.entries(namespaces)) {
      for (const [name, data] of Object.entries(environment)) {
        allSecrets.push({
          name,
          ns,
          env,
          provider: data.provider || '',
          tags: data.tags ? data.tags.join(' ') : '',
          type: data.type || '',
          ...data
        });
      }
    }
  }

  // Configure Fuse.js for fuzzy search
  const fuse = new Fuse(allSecrets, {
    keys: [
      { name: 'name', weight: 0.4 },
      { name: 'provider', weight: 0.25 },
      { name: 'tags', weight: 0.2 },
      { name: 'type', weight: 0.15 }
    ],
    threshold: validThreshold,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
    shouldSort: true
  });

  // Perform fuzzy search with error handling
  try {
    const results = fuse.search(query, { limit: validLimit });

    return results.map(result => ({
      name: result.item.name,
      ns: result.item.ns,
      env: result.item.env,
      score: result.score,
      ...result.item
    }));
  } catch (err) {
    // Return empty array on search errors to prevent crashes
    console.error('Fuzzy search error:', err.message);
    return [];
  }
}

// Get all namespaces
export function getNamespaces(vault) {
  return Object.keys(vault.namespaces);
}

// Get all environments for a namespace
export function getEnvironments(vault, ns) {
  const namespace = vault.namespaces[ns];
  if (!namespace) return [];
  return Object.keys(namespace);
}

// Vault exists check
export function vaultExists() {
  return fs.existsSync(VAULT_FILE);
}

export { VAULT_DIR, VAULT_FILE };
