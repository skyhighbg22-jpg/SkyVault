import inquirer from 'inquirer';
import { loadVault, saveVault, setSecret } from '../core/vault.js';
import { hasSession } from '../core/session.js';
import { success, error, warning, info, header, formatExpiry, masked } from '../ui/output.js';
import { getTemplate, getTemplateNames, suggestTemplates } from '../utils/templates.js';
import clipboardy from 'clipboardy';
import crypto from 'crypto';

const SECRET_TYPES = ['api_key', 'password', 'token', 'certificate', 'other'];
const EXPIRY_OPTIONS = [
    { name: '30 days', value: '30d' },
    { name: '90 days', value: '90d' },
    { name: '6 months', value: '6m' },
    { name: '1 year', value: '1y' },
    { name: 'Never', value: 'never' }
];

// Parse expiry string (same as add.js)
function parseExpiry(input) {
    if (input === 'never') return null;

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

    throw new Error(`Invalid expiry format: ${input}`);
}

// Generate random secret using rejection sampling to eliminate modulo bias
function generateRandomSecret(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const charsetLength = charset.length;

    // Calculate the maximum value that avoids modulo bias
    // This ensures uniform distribution by rejecting values that would cause bias
    const maxVal = 0x100000000 - (0x100000000 % charsetLength);

    const randomValues = new Uint32Array(length);
    crypto.randomFillSync(randomValues);

    let result = '';
    for (let i = 0; i < length; i++) {
        let randomValue = randomValues[i];

        // Rejection sampling: discard values that would cause modulo bias
        // This ensures each character is uniformly distributed
        while (randomValue >= maxVal) {
            const newVal = new Uint32Array(1);
            crypto.randomFillSync(newVal);
            randomValue = newVal[0];
        }

        result += charset[randomValue % charsetLength];
    }

    return result;
}

export function registerQuickAdd(program) {
    program
        .command('quick-add')
        .alias('qa')
        .description('Interactive wizard to add a new secret')
        .option('--ns <namespace>', 'Target namespace', 'default')
        .option('--env <environment>', 'Target environment', 'dev')
        .action(async (options) => {
            try {
                // Check if vault is unlocked
                if (!hasSession()) {
                    error('Vault is locked. Run "skv vault unlock" first.');
                    process.exit(4);
                }

                // Load vault
                const vault = loadVault();
                const { ns, env } = options;

                // Welcome header
                header('🚀 Quick Add Wizard');
                info('Follow the prompts to add a new secret to your vault.\n');

                // Step 1: Choose secret type or template
                const { useTemplate } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'useTemplate',
                    message: 'Would you like to use a template for a common service?',
                    default: false
                }]);

                let template = null;
                let secretName = '';
                let secretType = 'api_key';

                if (useTemplate) {
                    // Show available templates
                    const templateNames = getTemplateNames();
                    const { selectedTemplate } = await inquirer.prompt([{
                        type: 'list',
                        name: 'selectedTemplate',
                        message: 'Select a template:',
                        choices: templateNames.map(t => ({
                            name: t,
                            value: t
                        })),
                        pageSize: 15
                    }]);

                    template = getTemplate(selectedTemplate);

                    // Step 2: Confirm or modify name
                    const defaultName = template ? `${template.provider}-api` : 'my-secret';
                    const { name } = await inquirer.prompt([{
                        type: 'input',
                        name: 'name',
                        message: 'Secret name:',
                        default: defaultName,
                        validate: (input) => {
                            if (!input || input.length === 0) {
                                return 'Name is required';
                            }
                            if (!/^[a-zA-Z0-9_-]{1,64}$/.test(input)) {
                                return 'Name must be 1-64 alphanumeric, underscore, or hyphen';
                            }
                            return true;
                        }
                    }]);

                    secretName = name;
                    secretType = template.type;

                } else {
                    // Manual entry - get secret type first
                    const { type } = await inquirer.prompt([{
                        type: 'list',
                        name: 'type',
                        message: 'Secret type:',
                        choices: SECRET_TYPES.map(t => ({ name: t, value: t })),
                        default: 'api_key'
                    }]);

                    secretType = type;

                    // Step 2: Get secret name
                    const { name } = await inquirer.prompt([{
                        type: 'input',
                        name: 'name',
                        message: 'Secret name:',
                        validate: (input) => {
                            if (!input || input.length === 0) {
                                return 'Name is required';
                            }
                            if (!/^[a-zA-Z0-9_-]{1,64}$/.test(input)) {
                                return 'Name must be 1-64 alphanumeric, underscore, or hyphen';
                            }
                            return true;
                        }
                    }]);

                    secretName = name;
                }

                // Step 3: Get secret value
                const { valueMethod } = await inquirer.prompt([{
                    type: 'list',
                    name: 'valueMethod',
                    message: 'How would you like to enter the secret?',
                    choices: [
                        { name: 'Type/paste it manually', value: 'manual' },
                        { name: 'Generate a random secure value', value: 'generate' }
                    ],
                    default: 'manual'
                }]);

                let value;

                if (valueMethod === 'generate') {
                    const { length } = await inquirer.prompt([{
                        type: 'number',
                        name: 'length',
                        message: 'Secret length:',
                        default: 32,
                        validate: (input) => {
                            if (input < 8) return 'Minimum length is 8';
                            if (input > 256) return 'Maximum length is 256';
                            return true;
                        }
                    }]);

                    value = generateRandomSecret(length);
                    info(`\n✅ Generated ${length}-character secret`);

                } else {
                    const { inputValue } = await inquirer.prompt([{
                        type: 'password',
                        name: 'inputValue',
                        message: 'Enter secret value:',
                        mask: '*',
                        validate: (input) => {
                            if (!input || input.length === 0) {
                                return 'Secret value cannot be empty';
                            }
                            return true;
                        }
                    }]);

                    // Confirm value
                    const { confirmValue } = await inquirer.prompt([{
                        type: 'password',
                        name: 'confirmValue',
                        message: 'Confirm secret value:',
                        mask: '*',
                        validate: (input) => {
                            if (input !== inputValue) {
                                return 'Values do not match';
                            }
                            return true;
                        }
                    }]);

                    value = inputValue;
                }

                // Step 4: Set expiration
                const defaultExpiry = template ? template.expiresDefault : '90d';
                const { expiry } = await inquirer.prompt([{
                    type: 'list',
                    name: 'expiry',
                    message: 'When should this secret expire?',
                    choices: EXPIRY_OPTIONS,
                    default: EXPIRY_OPTIONS.findIndex(e => e.value === defaultExpiry)
                }]);

                // Step 5: Optional description
                const { hasDescription } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'hasDescription',
                    message: 'Would you like to add a description?',
                    default: false
                }]);

                let description = null;
                if (hasDescription) {
                    const { desc } = await inquirer.prompt([{
                        type: 'input',
                        name: 'desc',
                        message: 'Description:'
                    }]);
                    description = desc;
                }

                // Step 6: Optional tags
                const { hasTags } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'hasTags',
                    message: 'Would you like to add tags?',
                    default: false
                }]);

                let tags = [];
                if (hasTags) {
                    const { tagsInput } = await inquirer.prompt([{
                        type: 'input',
                        name: 'tagsInput',
                        message: 'Tags (comma-separated):'
                    }]);
                    tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
                }

                // Add template tags if using template
                if (template && template.tags) {
                    for (const tag of template.tags) {
                        if (!tags.includes(tag)) {
                            tags.push(tag);
                        }
                    }
                }

                // Parse expiry
                let expires = parseExpiry(expiry);

                // Preview summary
                header('📋 Summary');
                console.log(`  Name:        ${secretName}`);
                console.log(`  Type:        ${secretType}`);
                if (template) {
                    console.log(`  Template:    ${template.name}`);
                }
                console.log(`  Value:       ${masked(value)}`);
                console.log(`  Expires:     ${expiry === 'never' ? 'Never' : formatExpiry(expires)}`);
                if (description) {
                    console.log(`  Description: ${description}`);
                }
                if (tags.length > 0) {
                    console.log(`  Tags:        ${tags.join(', ')}`);
                }
                console.log(`  Location:    ${ns}/${env}`);

                // Confirm save
                const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: '\nSave this secret?',
                    default: true
                }]);

                if (!confirm) {
                    info('\n❌ Cancelled');
                    return;
                }

                // Check if secret exists
                const existing = vault.namespaces[ns]?.[env]?.[secretName];
                if (existing) {
                    const { overwrite } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'overwrite',
                        message: `Secret '${secretName}' already exists. Overwrite?`,
                        default: false
                    }]);

                    if (!overwrite) {
                        info('\n❌ Cancelled');
                        return;
                    }
                }

                // Save to vault
                setSecret(vault, ns, env, secretName, {
                    value,
                    provider: template ? template.provider : null,
                    type: secretType,
                    expires,
                    tags,
                    description,
                    meta: {
                        template: template ? selectedTemplate || template.name : null
                    }
                });

                saveVault(vault);

                // Success!
                header('✅ Secret Added!');
                info(`Secret '${secretName}' has been saved to your vault.`);

                if (expires) {
                    info(`Expires: ${formatExpiry(expires)}`);
                }

                // Offer to copy to clipboard
                const { copyToClipboard } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'copyToClipboard',
                    message: 'Copy secret to clipboard?',
                    default: false
                }]);

                if (copyToClipboard) {
                    clipboardy.writeSync(value);
                    success('Copied to clipboard!');
                    info('Clipboard will be cleared automatically.');
                }

            } catch (e) {
                error(e.message);
                process.exit(1);
            }
        });
}
