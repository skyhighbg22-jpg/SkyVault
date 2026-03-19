import fs from 'fs';
import { loadVault, listSecrets } from '../core/vault.js';
import { success, error } from '../ui/output.js';

export function registerExport(program) {
  program
    .command('export [name]')
    .description('Export secrets to file')
    .option('--ns <namespace>', 'Source namespace', 'default')
    .option('--env <environment>', 'Source environment', 'dev')
    .option('--format <format>', 'Export format (env, json)', 'env')
    .option('--out <file>', 'Output file')
    .option('--all', 'Export all secrets', false)
    .action(async (name, options) => {
      try {
        const vault = loadVault();
        
        let secrets = [];
        
        if (name) {
          // Export single secret
          const secret = vault.namespaces[options.ns]?.[options.env]?.[name];
          if (!secret) {
            error(`Secret '${name}' not found`);
            process.exit(2);
          }
          secrets = [{ name, ...secret }];
        } else if (options.all) {
          // Export all secrets
          secrets = listSecrets(vault, options.ns, options.env);
        } else {
          error('Specify a secret name or use --all to export all secrets');
          process.exit(1);
        }
        
        // Format output
        let output = '';
        switch (options.format) {
          case 'env':
            output = secrets.map(s => `${s.name}=${s.value}`).join('\n');
            break;
          case 'json':
            const jsonObj = {};
            secrets.forEach(s => jsonObj[s.name] = s.value);
            output = JSON.stringify(jsonObj, null, 2);
            break;
          default:
            error(`Unsupported format: ${options.format}`);
            process.exit(1);
        }
        
        // Output
        if (options.out) {
          fs.writeFileSync(options.out, output);
          success(`Exported ${secrets.length} secret(s) to ${options.out}`);
        } else {
          console.log(output);
        }
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
