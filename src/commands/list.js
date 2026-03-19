import { loadVault, listSecrets } from '../core/vault.js';
import { success, error, createTable, printTable, printJson, formatDate, formatExpiry, info } from '../ui/output.js';

export function registerList(program) {
  program
    .command('list')
    .description('List all secrets in current context')
    .option('--ns <namespace>', 'Filter by namespace')
    .option('--env <environment>', 'Filter by environment')
    .option('--provider <provider>', 'Filter by provider')
    .option('--type <type>', 'Filter by type')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--expired', 'Show only expired secrets')
    .option('--expiring', 'Show secrets expiring within 7 days')
    .option('--sort <field>', 'Sort by field (name, updated, expires)', 'name')
    .option('--json', 'Output as JSON', false)
    .option('--all', 'Show all namespaces and environments', false)
    .action(async (options) => {
      try {
        const vault = loadVault();
        
        let secrets = [];
        
        // Determine which namespaces/environments to search
        const namespacesToSearch = options.all 
          ? Object.keys(vault.namespaces)
          : [options.ns || 'default'];
        
        for (const ns of namespacesToSearch) {
          const envsToSearch = options.all
            ? Object.keys(vault.namespaces[ns] || {})
            : [options.env || 'dev'];
          
          for (const env of envsToSearch) {
            const envSecrets = listSecrets(vault, ns, env);
            secrets.push(...envSecrets.map(s => ({ ...s, ns, env })));
          }
        }
        
        // Apply filters
        if (options.provider) {
          secrets = secrets.filter(s => s.provider === options.provider);
        }
        
        if (options.type) {
          secrets = secrets.filter(s => s.type === options.type);
        }
        
        if (options.tags) {
          const tagFilters = options.tags.split(',').map(t => t.trim());
          secrets = secrets.filter(s => 
            tagFilters.every(tag => s.tags && s.tags.includes(tag))
          );
        }
        
        if (options.expired) {
          const now = new Date();
          secrets = secrets.filter(s => s.expires && new Date(s.expires) < now);
        }
        
        if (options.expiring) {
          const now = new Date();
          const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          secrets = secrets.filter(s => {
            if (!s.expires) return false;
            const expiry = new Date(s.expires);
            return expiry > now && expiry <= sevenDays;
          });
        }
        
        // Sort
        secrets.sort((a, b) => {
          switch (options.sort) {
            case 'updated':
              return new Date(b.updated) - new Date(a.updated);
            case 'expires':
              if (!a.expires) return 1;
              if (!b.expires) return -1;
              return new Date(a.expires) - new Date(b.expires);
            case 'name':
            default:
              return a.name.localeCompare(b.name);
          }
        });
        
        // Output
        if (options.json) {
          printJson(secrets.map(s => ({
            name: s.name,
            ns: s.ns,
            env: s.env,
            type: s.type,
            provider: s.provider,
            tags: s.tags,
            expires: s.expires,
            updated: s.updated
          })));
        } else {
          if (secrets.length === 0) {
            info('No secrets found');
            return;
          }
          
          const table = createTable(['Name', 'Type', 'Provider', 'Tags', 'Updated', 'Expires']);
          
          secrets.forEach(secret => {
            table.push([
              `${secret.ns}/${secret.env}/${secret.name}`,
              secret.type || 'secret',
              secret.provider || '-',
              secret.tags ? secret.tags.join(', ') : '-',
              formatDate(secret.updated),
              formatExpiry(secret.expires)
            ]);
          });
          
          printTable(table);
          
          info(`\n${secrets.length} secret(s) found`);
          
          if (!options.all) {
            info(`Use --all to show all namespaces and environments`);
          }
        }
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
