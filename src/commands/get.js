import { loadVault, getSecret, listSecrets, findSecrets } from '../core/vault.js';
import { hasSession } from '../core/session.js';
import { success, error, masked, printJson, printRaw, info, formatExpiry, notFoundError, authError } from '../ui/output.js';
import clipboardy from 'clipboardy';
import Fuse from 'fuse.js';
import leven from 'leven';

export function registerGet(program) {
  program
    .command('get <name>')
    .description('Retrieve a secret (masked by default)')
    .option('--env <environment>', 'Target environment', 'dev')
    .option('--ns <namespace>', 'Target namespace', 'default')
    .option('--raw', 'Output unmasked secret value', false)
    .option('--copy', 'Send output to clipboard, suppress terminal print', false)
    .option('--ttl <seconds>', 'Clear clipboard after N seconds', '30')
    .option('--field <field>', 'Retrieve specific field (value, provider, type, expires, tags, description)')
    .option('--json', 'Output as JSON', false)
    .action(async (name, options) => {
      try {
        // Check if vault is unlocked
        if (!hasSession()) {
          authError('Vault is locked', { locked: true });
          process.exit(4);
        }

        const vault = loadVault();
        const { ns, env } = options;

        const secret = getSecret(vault, ns, env, name);

        if (!secret) {
          // Try to find similar secrets for suggestions
          const allSecrets = [];
          for (const n of Object.keys(vault.namespaces)) {
            for (const e of Object.keys(vault.namespaces[n] || {})) {
              const secrets = listSecrets(vault, n, e);
              for (const s of secrets) {
                allSecrets.push(`${n}/${e}/${s.name}`);
              }
            }
          }

          // Find similar using Levenshtein distance
          const suggestions = allSecrets
            .map(s => ({ name: s, distance: leven(name, s.split('/').pop()) }))
            .filter(s => s.distance <= 3)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5)
            .map(s => s.name);

          notFoundError(name, suggestions, {
            ns,
            env,
            listCommand: true,
            missingSession: !hasSession()
          });
          process.exit(2);
        }

        // Handle specific field request
        if (options.field) {
          const field = options.field;
          if (!(field in secret)) {
            error(`Field '${field}' not found in secret`);
            process.exit(2);
          }

          const value = secret[field];

          if (options.json) {
            printJson({ [field]: value });
          } else if (options.copy) {
            clipboardy.writeSync(String(value));
            success(`Copied ${field} to clipboard`);

            // Auto-clear after TTL
            const ttl = parseInt(options.ttl) * 1000;
            setTimeout(() => {
              clipboardy.writeSync('');
              info('Clipboard cleared');
            }, ttl);
          } else {
            printRaw(value);
          }

          return;
        }

        // Full secret output
        if (options.json) {
          // Return copy without raw value for security
          const safeSecret = { ...secret };
          if (!options.raw) {
            safeSecret.value = masked(secret.value);
          }
          printJson({
            name,
            ns,
            env,
            ...safeSecret
          });
        } else if (options.copy) {
          // Copy to clipboard
          clipboardy.writeSync(secret.value);
          success(`Secret copied to clipboard`);
          info(`Clears in ${options.ttl}s`);

          // Auto-clear after TTL
          const ttl = parseInt(options.ttl) * 1000;
          setTimeout(() => {
            clipboardy.writeSync('');
            info('Clipboard cleared');
          }, ttl);
        } else {
          // Standard output
          console.log(`\nSecret: ${name}`);
          console.log(`Namespace: ${ns}`);
          console.log(`Environment: ${env}`);
          console.log(`Type: ${secret.type || 'secret'}`);
          if (secret.provider) {
            console.log(`Provider: ${secret.provider}`);
          }
          if (secret.description) {
            console.log(`Description: ${secret.description}`);
          }
          if (secret.tags && secret.tags.length > 0) {
            console.log(`Tags: ${secret.tags.join(', ')}`);
          }
          if (secret.expires) {
            console.log(`Expires: ${formatExpiry(secret.expires)}`);
          }
          console.log(`\nValue: ${options.raw ? secret.value : masked(secret.value)}`);

          if (!options.raw) {
            console.log('\nUse --raw to reveal or --copy to copy to clipboard');
          }
        }

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
