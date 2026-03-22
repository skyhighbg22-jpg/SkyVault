import inquirer from 'inquirer';
import { loadVault, saveVault, setSecret, VAULT_FILE } from '../core/vault.js';
import { success, error, header, warning, formatExpiry, info, validationError } from '../ui/output.js';
import { getTemplate, getTemplateNames, getTemplateInfo, suggestTemplates } from '../utils/templates.js';
import clipboardy from 'clipboardy';
import crypto from 'crypto';

const VALID_NAME_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const VALID_PROVIDER_REGEX = /^[a-z0-9_-]{1,32}$/;

export function registerAdd(program) {
  program
    .command('add <name>')
    .description('Add a new secret (use --template for common services)')
    .option('--template <name>', 'Use a template (aws, github, openai, stripe, etc.)')
    .option('--provider <provider>', 'Secret provider (e.g., aws, github)')
    .option('--key', 'Use as encryption key')
    .option('--type <type>', 'Secret type', 'secret')
    .option('--env <environment>', 'Target environment', 'dev')
    .option('--ns <namespace>', 'Target namespace', 'default')
    .option('--expires <expiry>', 'Expiry date (90d, 6m, 1y, or ISO date)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--description <desc>', 'Secret description')
    .option('--overwrite', 'Overwrite existing secret', false)
    .option('--generate', 'Generate a random secret value', false)
    .option('--length <length>', 'Generated secret length', '32')
    .action(async (name, options) => {
      try {
        // Validate name
        if (!VALID_NAME_REGEX.test(name)) {
          validationError('name', 'must be 1-64 alphanumeric, underscore, or hyphen characters', ['Use only letters, numbers, underscores (_) and hyphens (-)']);
          process.exit(1);
        }

        // Handle template
        let template = null;
        if (options.template) {
          template = getTemplate(options.template);
          if (!template) {
            const suggestions = suggestTemplates(options.template);
            error(`Template '${options.template}' not found.`);
            if (suggestions.length > 0) {
              info('Did you mean: ' + suggestions.slice(0, 5).join(', '));
            }
            info('Run "skv templates" to see all available templates.');
            process.exit(1);
          }
          // Show template info
          info(`Using template: ${template.name}`);
        }

        // Validate provider if provided
        if (options.provider && !VALID_PROVIDER_REGEX.test(options.provider)) {
          validationError('provider', 'must be 1-32 lowercase alphanumeric, underscore, or hyphen', ['Examples: aws, github, stripe']);
          process.exit(1);
        }

        const vault = loadVault();
        const { ns, env } = options;

        // Check if secret exists
        const existing = vault.namespaces[ns]?.[env]?.[name];
        if (existing && !options.overwrite) {
          error(`Secret '${name}' already exists. Use --overwrite to replace it.`);
          process.exit(3);
        }

        let value;

        if (options.generate) {
          // Generate random value
          const length = parseInt(options.length);
          value = generateRandomSecret(length);
          info(`Generated ${length}-character secret`);
        } else {
          // Prompt for value
          const { value: inputValue } = await inquirer.prompt([{
            type: 'password',
            name: 'value',
            message: 'Enter secret value:',
            mask: '*',
            validate: (input) => {
              if (!input || input.length === 0) {
                return 'Secret value cannot be empty';
              }
              if (input.length > 10000) {
                return 'Secret value cannot exceed 10,000 characters';
              }
              return true;
            }
          }]);

          value = inputValue;
        }

        // Parse expiry - use template default if not specified
        let expires = null;
        const expiryInput = options.expires || (template ? template.expiresDefault : null);
        if (expiryInput && expiryInput !== 'never') {
          expires = parseExpiry(expiryInput);
        }

        // Parse tags - merge with template tags
        let tags = [];
        if (options.tags) {
          tags = options.tags.split(',').map(t => t.trim()).filter(t => t);
        }
        if (template && template.tags) {
          // Add template tags that aren't already present
          for (const tag of template.tags) {
            if (!tags.includes(tag)) {
              tags.push(tag);
            }
          }
        }

        // Determine type, provider, and description from template or options
        const secretType = options.type || (template ? template.type : 'secret');
        const secretProvider = options.provider || (template ? template.provider : null);
        const secretDescription = options.description || (template ? template.description : null);

        // Create secret object
        const secretData = {
          value,
          provider: secretProvider,
          type: secretType,
          expires,
          tags,
          description: secretDescription,
          meta: {
            template: template ? options.template : null
          }
        };

        // Save to vault
        setSecret(vault, ns, env, name, secretData);
        saveVault(vault);

        success(`Secret '${name}' ${existing ? 'updated' : 'added'} successfully`);

        if (expires) {
          info(`Expires: ${formatExpiry(expires)}`);
        }

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}

// Parse expiry string
function parseExpiry(input) {
  const now = new Date();

  if (/^\d+d$/.test(input)) {
    const days = parseInt(input);
    now.setDate(now.getDate() + days);
    return now.toISOString();
  }

  if (/^\d+m$/.test(input)) {
    const months = parseInt(input);
    now.setMonth(now.getMonth() + months);
    return now.toISOString();
  }

  if (/^\d+y$/.test(input)) {
    const years = parseInt(input);
    now.setFullYear(now.getFullYear() + years);
    return now.toISOString();
  }

  // Try parsing as ISO date
  const date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  throw new Error(`Invalid expiry format: ${input}. Use 90d, 6m, 1y, or ISO date`);
}

// Generate random secret
function generateRandomSecret(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += charset[randomBytes[i] % charset.length];
  }

  return result;
}


