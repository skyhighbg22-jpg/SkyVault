import { loadVault, getSecret, saveVault } from '../core/vault.js';
import { success, error, createTable, printTable, formatDate, masked } from '../ui/output.js';

export function registerHistory(program) {
  program
    .command('history <name>')
    .description('View version history of a secret')
    .option('--ns <namespace>', 'Target namespace', 'default')
    .option('--env <environment>', 'Target environment', 'dev')
    .option('--raw', 'Show unmasked values', false)
    .option('--limit <n>', 'Limit number of versions shown', '10')
    .action(async (name, options) => {
      try {
        const vault = loadVault();
        const secret = getSecret(vault, options.ns, options.env, name);
        
        if (!secret) {
          error(`Secret '${name}' not found`);
          process.exit(2);
        }
        
        const versions = [
          { version: 'current', date: secret.updated, value: secret.value },
          ...(secret.history || []).map((h, i) => ({
            version: String(secret.history.length - i),
            date: h.rotated || h.updated,
            value: h.value
          }))
        ];
        
        const limit = parseInt(options.limit);
        const limited = versions.slice(0, limit);
        
        console.log(`\nHistory for '${name}':`);
        console.log(`Total versions: ${versions.length}\n`);
        
        const table = createTable(['Version', 'Date', 'Value Preview']);
        
        limited.forEach(v => {
          table.push([
            v.version,
            formatDate(v.date),
            options.raw ? v.value : masked(v.value)
          ]);
        });
        
        printTable(table);
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}

export function registerRollback(program) {
  program
    .command('rollback <name>')
    .description('Restore a previous version of a secret')
    .option('--ns <namespace>', 'Target namespace', 'default')
    .option('--env <environment>', 'Target environment', 'dev')
    .requiredOption('--to <version>', 'Version number to restore')
    .action(async (name, options) => {
      try {
        const vault = loadVault();
        const secret = getSecret(vault, options.ns, options.env, name);
        
        if (!secret) {
          error(`Secret '${name}' not found`);
          process.exit(2);
        }
        
        const targetVersion = options.to;
        let targetValue = null;
        
        if (targetVersion === 'current') {
          error('Cannot rollback to current version');
          process.exit(1);
        }
        
        const versionNum = parseInt(targetVersion);
        if (isNaN(versionNum) || versionNum < 1) {
          error(`Invalid version number: ${targetVersion}`);
          process.exit(1);
        }
        
        if (!secret.history || versionNum > secret.history.length) {
          error(`Version ${targetVersion} not found`);
          process.exit(2);
        }
        
        // Get value from history (reverse order)
        const historyIndex = secret.history.length - versionNum;
        targetValue = secret.history[historyIndex].value;
        
        // Add current value to history
        if (!secret.history) {
          secret.history = [];
        }
        
        // Keep only last 10 versions
        if (secret.history.length >= 10) {
          secret.history = secret.history.slice(-9);
        }
        
        secret.history.push({
          value: secret.value,
          rotated: new Date().toISOString()
        });
        
        // Restore old value
        secret.value = targetValue;
        secret.updated = new Date().toISOString();
        
        saveVault(vault);
        
        success(`Rolled back '${name}' to version ${targetVersion}`);
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}

export function registerRotate(program) {
  program
    .command('rotate <name>')
    .description('Update a secret value with versioning')
    .option('--ns <namespace>', 'Target namespace', 'default')
    .option('--env <environment>', 'Target environment', 'dev')
    .option('--generate', 'Generate new random value', false)
    .option('--length <n>', 'Generated secret length', '32')
    .action(async (name, options) => {
      try {
        const vault = loadVault();
        const secret = getSecret(vault, options.ns, options.env, name);
        
        if (!secret) {
          error(`Secret '${name}' not found`);
          process.exit(2);
        }
        
        // Archive current value
        if (!secret.history) {
          secret.history = [];
        }
        
        // Keep only last 10 versions
        if (secret.history.length >= 10) {
          secret.history = secret.history.slice(-9);
        }
        
        secret.history.push({
          value: secret.value,
          rotated: new Date().toISOString()
        });
        
        let newValue;
        
        if (options.generate) {
          // Generate new value
          const crypto = await import('crypto');
          const length = parseInt(options.length);
          const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
          newValue = '';
          const randomBytes = crypto.default.randomBytes(length);
          for (let i = 0; i < length; i++) {
            newValue += charset[randomBytes[i] % charset.length];
          }
        } else {
          // Prompt for new value
          const inquirer = (await import('inquirer')).default;
          const { value } = await inquirer.prompt([{
            type: 'password',
            name: 'value',
            message: 'Enter new secret value:',
            mask: '*'
          }]);
          newValue = value;
        }
        
        secret.value = newValue;
        secret.updated = new Date().toISOString();
        
        saveVault(vault);
        
        success(`Rotated secret '${name}'`);
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
