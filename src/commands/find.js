import { loadVault, findSecrets, fuzzyFindSecrets } from '../core/vault.js';
import { success, error, createTable, printTable, printJson, formatDate, formatExpiry, info } from '../ui/output.js';

export function registerFind(program) {
  program
    .command('find <query>')
    .description('Search for secrets by name, provider, or tags')
    .option('--in <field>', 'Search in specific field (name, provider, tags)', 'all')
    .option('--env <environment>', 'Filter by environment')
    .option('--ns <namespace>', 'Filter by namespace')
    .option('--regex', 'Treat query as regular expression', false)
    .option('--fuzzy', 'Use fuzzy search with fuse.js', false)
    .option('--threshold <value>', 'Fuzzy search threshold (0-1, lower is stricter)', '0.4')
    .option('--limit <n>', 'Maximum number of results', '50')
    .option('--json', 'Output as JSON', false)
    .action(async (query, options) => {
      try {
        const vault = loadVault();

        let results = [];

        if (options.regex) {
          // Regex search
          const regex = new RegExp(query, 'i');

          for (const [ns, namespaces] of Object.entries(vault.namespaces)) {
            if (options.ns && ns !== options.ns) continue;

            for (const [env, environment] of Object.entries(namespaces)) {
              if (options.env && env !== options.env) continue;

              for (const [name, data] of Object.entries(environment)) {
                let match = false;

                switch (options.in) {
                  case 'name':
                    match = regex.test(name);
                    break;
                  case 'provider':
                    match = data.provider && regex.test(data.provider);
                    break;
                  case 'tags':
                    match = data.tags && data.tags.some(tag => regex.test(tag));
                    break;
                  case 'all':
                  default:
                    match = regex.test(name) ||
                      (data.provider && regex.test(data.provider)) ||
                      (data.tags && data.tags.some(tag => regex.test(tag)));
                }

                if (match) {
                  results.push({ name, ns, env, ...data });
                }
              }
            }
          }
        } else if (options.fuzzy) {
          // Fuzzy search using fuse.js
          const threshold = Math.max(0, Math.min(1, parseFloat(options.threshold) || 0.4));
          const limit = Math.max(1, Math.min(1000, parseInt(options.limit) || 50));

          results = fuzzyFindSecrets(vault, query, { threshold, limit });

          // Apply filters after fuzzy search
          if (options.ns) {
            results = results.filter(s => s.ns === options.ns);
          }

          if (options.env) {
            results = results.filter(s => s.env === options.env);
          }
        } else {
          // Simple text search
          results = findSecrets(vault, query);

          // Apply filters
          if (options.ns) {
            results = results.filter(s => s.ns === options.ns);
          }

          if (options.env) {
            results = results.filter(s => s.env === options.env);
          }

          if (options.in !== 'all') {
            // Filter by specific field
            results = results.filter(s => {
              switch (options.in) {
                case 'name':
                  return s.name.toLowerCase().includes(query.toLowerCase());
                case 'provider':
                  return s.provider && s.provider.toLowerCase().includes(query.toLowerCase());
                case 'tags':
                  return s.tags && s.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
                default:
                  return true;
              }
            });
          }
        }

        // Sort by relevance (for non-fuzzy search)
        if (!options.fuzzy) {
          results.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
            const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());

            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;

            return a.name.localeCompare(b.name);
          });
        }

        // Output
        if (options.json) {
          printJson(results.map(s => ({
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
          if (results.length === 0) {
            info(`No secrets found matching '${query}'`);
            return;
          }

          const table = createTable(['Name', 'Namespace', 'Env', 'Type', 'Tags', 'Updated']);

          results.forEach(secret => {
            table.push([
              secret.name,
              secret.ns,
              secret.env,
              secret.type || 'secret',
              secret.tags ? secret.tags.join(', ') : '-',
              formatDate(secret.updated)
            ]);
          });

          printTable(table);

          info(`\n${results.length} result(s) found`);
        }

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
