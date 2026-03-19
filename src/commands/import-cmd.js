import fs from 'fs';
import { loadVault, saveVault, setSecret } from '../core/vault.js';
import { success, error, info } from '../ui/output.js';

export function registerImport(program) {
  program
    .command('import <file>')
    .description('Import secrets from .env / JSON / YAML')
    .option('--format <format>', 'File format (env, json, yaml)', 'auto')
    .option('--env <environment>', 'Target environment', 'dev')
    .option('--ns <namespace>', 'Target namespace', 'default')
    .option('--overwrite', 'Overwrite existing secrets', false)
    .option('--dry-run', 'Preview changes without importing', false)
    .action(async (file, options) => {
      try {
        if (!fs.existsSync(file)) {
          error(`File not found: ${file}`);
          process.exit(1);
        }
        
        const vault = loadVault();
        const content = fs.readFileSync(file, 'utf8');
        
        let secrets = [];
        
        // Auto-detect format
        let format = options.format;
        if (format === 'auto') {
          if (file.endsWith('.json')) format = 'json';
          else if (file.endsWith('.yaml') || file.endsWith('.yml')) format = 'yaml';
          else if (file.endsWith('.env')) format = 'env';
          else format = 'env'; // default
        }
        
        // Parse based on format
        switch (format) {
          case 'env':
            secrets = parseEnv(content);
            break;
          case 'json':
            const json = JSON.parse(content);
            if (Array.isArray(json)) {
              secrets = json;
            } else if (typeof json === 'object') {
              secrets = Object.entries(json).map(([name, value]) => ({
                name,
                value: typeof value === 'string' ? value : JSON.stringify(value)
              }));
            }
            break;
          default:
            error(`Unsupported format: ${format}`);
            process.exit(1);
        }
        
        if (secrets.length === 0) {
          info('No secrets found to import');
          return;
        }
        
        // Preview or import
        if (options.dryRun) {
          console.log(`\nWould import ${secrets.length} secret(s):`);
          secrets.forEach(s => console.log(`  - ${s.name}`));
          return;
        }
        
        let imported = 0;
        let skipped = 0;
        
        for (const secret of secrets) {
          const existing = vault.namespaces[options.ns]?.[options.env]?.[secret.name];
          
          if (existing && !options.overwrite) {
            skipped++;
            continue;
          }
          
          setSecret(vault, options.ns, options.env, secret.name, {
            value: secret.value,
            type: secret.type || 'secret',
            provider: secret.provider || null,
            tags: secret.tags || []
          });
          
          imported++;
        }
        
        saveVault(vault);
        
        success(`Imported ${imported} secret(s)`);
        if (skipped > 0) {
          info(`${skipped} skipped (use --overwrite to replace)`);
        }
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}

function parseEnv(content) {
  const secrets = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const name = match[1].trim();
      let value = match[2].trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      secrets.push({ name, value });
    }
  }
  
  return secrets;
}
