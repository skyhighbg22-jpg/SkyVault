import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { loadVault, saveVault, setSecret } from '../core/vault.js';
import { hasSession } from '../core/session.js';
import { success, error, warning, info, header, createTable, printTable, authError } from '../ui/output.js';

/**
 * Parse .env file content with support for multi-line values
 * @param {string} content - Raw .env file content
 * @returns {Object} Parsed key-value pairs
 */
function parseEnvFile(content) {
    const result = {};
    const lines = content.split(/\r?\n/);

    let currentKey = null;
    let currentValue = '';
    let inMultiline = false;
    let quoteChar = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip comments at the start of a new key
        const trimmed = line.trim();

        if (!inMultiline) {
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            // Check if this is a KEY=VALUE line (not continuation)
            const match = trimmed.match(/^([^=]+)=(.*)$/);
            if (!match) {
                continue;
            }

            const key = match[1].trim();
            let value = match[2];

            // Check if value starts a multi-line string
            if (value.startsWith('"') || value.startsWith("'")) {
                quoteChar = value[0];
                value = value.slice(1);

                // Check if the quote is closed on the same line
                const closingQuote = value.indexOf(quoteChar);
                if (closingQuote === -1) {
                    // Multi-line value starts
                    inMultiline = true;
                    currentKey = key;
                    currentValue = value;
                    continue;
                } else {
                    // Single-line quoted value
                    value = value.slice(0, closingQuote);
                }
            }

            // Store the key-value pair
            result[key] = unescapeValue(value.trim());
        } else {
            // Continuing a multi-line value
            const closingQuote = line.indexOf(quoteChar);
            if (closingQuote !== -1) {
                // Multi-line value ends
                currentValue += '\n' + line.slice(0, closingQuote);
                result[currentKey] = unescapeValue(currentValue);
                inMultiline = false;
                currentKey = null;
                currentValue = '';
                quoteChar = null;
            } else {
                // Continue multi-line
                currentValue += '\n' + line;
            }
        }
    }

    return result;
}

/**
 * Unescape common escape sequences in .env values
 * @param {string} value - The value to unescape
 * @returns {string} Unescaped value
 */
function unescapeValue(value) {
    return value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
}

/**
 * Detect service from key name
 * @param {string} key - Environment variable key
 * @returns {string|null} Detected provider
 */
function detectProvider(key) {
    const lowerKey = key.toLowerCase();

    const providers = {
        aws: ['aws_access_key', 'aws_secret', 'aws_'],
        github: ['github', 'gh_'],
        stripe: ['stripe'],
        sendgrid: ['sendgrid'],
        slack: ['slack'],
        twilio: ['twilio'],
        openai: ['openai', 'sk-'],
        firebase: ['firebase'],
        supabase: ['supabase'],
        vercel: ['vercel'],
        netlify: ['netlify'],
        algolia: ['algolia'],
        sentry: ['sentry'],
        datadog: ['datadog']
    };

    for (const [provider, prefixes] of Object.entries(providers)) {
        for (const prefix of prefixes) {
            if (lowerKey.includes(prefix)) {
                return provider;
            }
        }
    }

    return null;
}

/**
 * Suggest secret name from key
 * @param {string} key - Environment variable key
 * @returns {string} Suggested secret name
 */
function suggestSecretName(key) {
    // Convert to lowercase, replace underscores with hyphens
    return key.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function registerImportEnv(program) {
    program
        .command('import-env <file>')
        .description('Import secrets from .env file')
        .option('--ns <namespace>', 'Target namespace', 'default')
        .option('--env <environment>', 'Target environment', 'dev')
        .option('--prefix <prefix>', 'Only import keys starting with this prefix')
        .option('--exclude <keys>', 'Comma-separated keys to exclude')
        .option('--dry-run', 'Preview imports without saving', false)
        .option('--overwrite', 'Overwrite existing secrets', false)
        .action(async (filePath, options) => {
            try {
                // Check if vault is unlocked
                if (!hasSession()) {
                    authError('Vault is locked', { locked: true });
                    process.exit(4);
                }

                // Resolve and normalize the file path to prevent path traversal
                const resolvedPath = path.resolve(filePath);
                const normalizedPath = path.normalize(resolvedPath);

                // Check file exists
                if (!fs.existsSync(normalizedPath)) {
                    error(`File not found: ${normalizedPath}`);
                    process.exit(1);
                }

                // Check it's actually a file (not a directory)
                const stats = fs.statSync(normalizedPath);
                if (!stats.isFile()) {
                    error(`Path is not a file: ${normalizedPath}`);
                    process.exit(1);
                }

                // Warn if not a .env file (but don't block)
                if (!normalizedPath.endsWith('.env') && !normalizedPath.includes('.env.')) {
                    warning(`Warning: File does not appear to be a .env file`);
                }

                // Read and parse file
                const content = fs.readFileSync(normalizedPath, 'utf8');
                const envVars = parseEnvFile(content);

                if (Object.keys(envVars).length === 0) {
                    error('No valid environment variables found in file');
                    process.exit(1);
                }

                info(`📁 Found ${Object.keys(envVars).length} environment variables`);

                // Apply prefix filter
                let keys = Object.keys(envVars);
                if (options.prefix) {
                    keys = keys.filter(k => k.startsWith(options.prefix));
                    info(`Filtered to ${keys.length} keys with prefix '${options.prefix}'`);
                }

                // Apply exclude filter
                if (options.exclude) {
                    const excludeList = options.exclude.split(',').map(k => k.trim());
                    keys = keys.filter(k => !excludeList.includes(k));
                    info(`Excluded ${excludeList.length} keys, ${keys.length} remaining`);
                }

                // Load vault to check existing secrets
                const vault = loadVault();
                const existingSecrets = vault.namespaces[options.ns]?.[options.env] || {};

                // Prepare secrets for import
                const secretsToImport = [];
                for (const key of keys) {
                    const value = envVars[key];
                    const secretName = suggestSecretName(key);
                    const provider = detectProvider(key);

                    secretsToImport.push({
                        key,
                        secretName,
                        value,
                        provider,
                        exists: !!existingSecrets[secretName]
                    });
                }

                // Show preview
                header('📋 Import Preview');

                const table = createTable(['Key', 'Secret Name', 'Provider', 'Status']);
                for (const secret of secretsToImport) {
                    table.push([
                        secret.key,
                        secret.secretName,
                        secret.provider || '-',
                        secret.exists ? '⚠️ Exists' : 'New'
                    ]);
                }
                printTable(table);

                // Check for conflicts
                const conflicts = secretsToImport.filter(s => s.exists);
                if (conflicts.length > 0 && !options.overwrite) {
                    warning(`\n${conflicts.length} secrets already exist. Use --overwrite to replace.`);
                }

                // Ask for confirmation unless dry-run
                if (options.dryRun) {
                    info('\n🔍 Dry run complete. Run without --dry-run to import.');
                    return;
                }

                const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: `Import ${secretsToImport.length} secrets to ${options.ns}/${options.env}?`,
                    default: true
                }]);

                if (!confirm) {
                    info('Import cancelled');
                    return;
                }

                // Import secrets
                let imported = 0;
                let skipped = 0;

                for (const secret of secretsToImport) {
                    if (secret.exists && !options.overwrite) {
                        skipped++;
                        continue;
                    }

                    setSecret(vault, options.ns, options.env, secret.secretName, {
                        value: secret.value,
                        provider: secret.provider,
                        type: 'env_import',
                        tags: ['imported', 'env'],
                        description: `Imported from ${path.basename(filePath)} (${secret.key})`,
                        expires: null,
                        meta: {
                            sourceKey: secret.key,
                            sourceFile: filePath
                        }
                    });

                    imported++;
                }

                // Save vault
                saveVault(vault);

                // Summary
                header('✅ Import Complete');
                console.log(`  Imported: ${imported}`);
                if (skipped > 0) {
                    console.log(`  Skipped: ${skipped}`);
                }
                console.log(`  Location: ${options.ns}/${options.env}`);

            } catch (e) {
                error(e.message);
                process.exit(1);
            }
        });
}
