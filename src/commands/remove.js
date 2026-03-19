import inquirer from 'inquirer';
import { loadVault, saveVault, deleteSecret } from '../core/vault.js';
import { success, error, warning, info } from '../ui/output.js';

export function registerRemove(program) {
  program
    .command('remove <name>')
    .description('Delete a secret permanently')
    .option('--env <environment>', 'Target environment', 'dev')
    .option('--ns <namespace>', 'Target namespace', 'default')
    .option('--force', 'Skip confirmation prompt', false)
    .option('--pattern', 'Treat name as glob pattern', false)
    .option('--all', 'Remove all secrets in namespace/environment', false)
    .action(async (name, options) => {
      try {
        const vault = loadVault();
        const { ns, env } = options;
        
        if (options.all) {
          // Remove all secrets in namespace/environment
          if (!options.force) {
            const { confirm } = await inquirer.prompt([{
              type: 'confirm',
              name: 'confirm',
              message: `Remove ALL secrets in ${ns}/${env}? This cannot be undone.`,
              default: false
            }]);
            
            if (!confirm) {
              info('Aborted');
              return;
            }
          }
          
          if (vault.namespaces[ns] && vault.namespaces[ns][env]) {
            const count = Object.keys(vault.namespaces[ns][env]).length;
            delete vault.namespaces[ns][env];
            
            // Clean up empty namespace
            if (Object.keys(vault.namespaces[ns]).length === 0) {
              delete vault.namespaces[ns];
            }
            
            saveVault(vault);
            success(`Removed ${count} secret(s) from ${ns}/${env}`);
          } else {
            info('No secrets found in namespace/environment');
          }
          
          return;
        }
        
        // Check if secret exists
        const secret = vault.namespaces[ns]?.[env]?.[name];
        
        if (!secret) {
          error(`Secret '${name}' not found in ${ns}/${env}`);
          process.exit(2);
        }
        
        // Confirm deletion unless --force
        if (!options.force) {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Delete secret '${name}'? This cannot be undone.`,
            default: false
          }]);
          
          if (!confirm) {
            info('Aborted');
            return;
          }
        }
        
        // Delete the secret
        const deleted = deleteSecret(vault, ns, env, name);
        
        if (deleted) {
          saveVault(vault);
          success(`Secret '${name}' deleted permanently`);
        } else {
          error(`Failed to delete secret '${name}'`);
          process.exit(1);
        }
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
