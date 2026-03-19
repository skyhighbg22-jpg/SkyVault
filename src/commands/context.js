import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadVault, getNamespaces, getEnvironments, saveVault } from '../core/vault.js';
import { success, error, info, createTable, printTable } from '../ui/output.js';

const CONTEXT_FILE = path.join(os.homedir(), '.skyvault', 'context');

function getCurrentContext() {
  if (fs.existsSync(CONTEXT_FILE)) {
    const content = fs.readFileSync(CONTEXT_FILE, 'utf8').trim();
    const parts = content.split('/');
    if (parts.length === 2) {
      return { ns: parts[0], env: parts[1] };
    }
  }
  return { ns: 'default', env: 'dev' };
}

function setCurrentContext(ns, env) {
  const dir = path.dirname(CONTEXT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONTEXT_FILE, `${ns}/${env}`);
}

export function registerContext(program) {
  const contextCmd = program
    .command('context')
    .description('Manage namespace/environment contexts');
  
  // Create context
  contextCmd
    .command('create <ns> [env]')
    .description('Create a new namespace or environment')
    .action(async (ns, env = 'dev') => {
      try {
        const vault = loadVault();
        
        if (!vault.namespaces[ns]) {
          vault.namespaces[ns] = {};
        }
        
        if (!vault.namespaces[ns][env]) {
          vault.namespaces[ns][env] = {};
          saveVault(vault);
          success(`Created ${ns}/${env}`);
        } else {
          info(`${ns}/${env} already exists`);
        }
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
  
  // Use context
  contextCmd
    .command('use <ns> [env]')
    .description('Switch to a namespace/environment context')
    .action(async (ns, env = 'dev') => {
      try {
        const vault = loadVault();
        
        // Validate namespace exists
        if (!vault.namespaces[ns]) {
          error(`Namespace '${ns}' does not exist`);
          process.exit(2);
        }
        
        // Create environment if it doesn't exist
        if (!vault.namespaces[ns][env]) {
          vault.namespaces[ns][env] = {};
          saveVault(vault);
        }
        
        setCurrentContext(ns, env);
        success(`Switched to ${ns}/${env}`);
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
  
  // List contexts
  contextCmd
    .command('list')
    .description('List all namespaces and environments')
    .option('--json', 'Output as JSON', false)
    .action(async (options) => {
      try {
        const vault = loadVault();
        const current = getCurrentContext();
        
        const namespaces = getNamespaces(vault);
        
        if (namespaces.length === 0) {
          info('No namespaces found');
          return;
        }
        
        if (options.json) {
          const data = namespaces.map(ns => ({
            name: ns,
            environments: getEnvironments(vault, ns),
            current: ns === current.ns
          }));
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.log('\nNamespaces and Environments:');
          console.log('=' .repeat(50));
          
          namespaces.forEach(ns => {
            const envs = getEnvironments(vault, ns);
            const isCurrentNs = ns === current.ns;
            
            if (isCurrentNs) {
              console.log(`\n→ ${ns} (current)`);
            } else {
              console.log(`\n  ${ns}`);
            }
            
            envs.forEach(env => {
              const isCurrentEnv = isCurrentNs && env === current.env;
              if (isCurrentEnv) {
                console.log(`    → ${env} (current)`);
              } else {
                console.log(`      ${env}`);
              }
            });
          });
          
          console.log('\n');
          info(`Current context: ${current.ns}/${current.env}`);
        }
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
  
  // Remove context (delete namespace or environment)
  contextCmd
    .command('remove <ns> [env]')
    .description('Remove a namespace or environment')
    .option('--force', 'Skip confirmation', false)
    .action(async (ns, env, options) => {
      try {
        const vault = loadVault();
        
        if (!vault.namespaces[ns]) {
          error(`Namespace '${ns}' does not exist`);
          process.exit(2);
        }
        
        if (env) {
          // Remove specific environment
          if (!vault.namespaces[ns][env]) {
            error(`Environment '${env}' does not exist in namespace '${ns}'`);
            process.exit(2);
          }
          
          const secretCount = Object.keys(vault.namespaces[ns][env]).length;
          
          if (secretCount > 0 && !options.force) {
            error(`Environment '${env}' contains ${secretCount} secrets. Use --force to remove.`);
            process.exit(1);
          }
          
          delete vault.namespaces[ns][env];
          
          // Remove empty namespace
          if (Object.keys(vault.namespaces[ns]).length === 0) {
            delete vault.namespaces[ns];
          }
          
          saveVault(vault);
          success(`Removed environment ${ns}/${env}`);
        } else {
          // Remove entire namespace
          const envCount = Object.keys(vault.namespaces[ns]).length;
          const totalSecrets = Object.values(vault.namespaces[ns])
            .reduce((sum, env) => sum + Object.keys(env).length, 0);
          
          if (totalSecrets > 0 && !options.force) {
            error(`Namespace '${ns}' contains ${totalSecrets} secrets across ${envCount} environments. Use --force to remove.`);
            process.exit(1);
          }
          
          delete vault.namespaces[ns];
          saveVault(vault);
          success(`Removed namespace ${ns}`);
        }
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
  
  // Show current context
  contextCmd
    .command('current')
    .description('Show current context')
    .action(async () => {
      const current = getCurrentContext();
      console.log(`${current.ns}/${current.env}`);
    });
}

export { getCurrentContext, setCurrentContext };
