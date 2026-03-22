import inquirer from 'inquirer';
import { vaultExists, VAULT_FILE } from '../core/vault.js';
import { initVault, loadVault } from '../core/encrypted-vault.js';
import { createSession } from '../core/session.js';
import { success, error, warning, info, header } from '../ui/output.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Check if this is first run
function isFirstRun() {
    return !vaultExists();
}

// ASCII Art Logo
const LOGO = `
  ██████╗ ███████╗████████╗██████╗  ██████╗ 
  ██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██╔═══██╗
  ██████╔╝█████╗     ██║   ██████╔╝██║   ██║
  ██╔══██╗██╔══╝     ██║   ██╔══██╗██║   ██║
  ██║  ██║███████╗   ██║   ██║  ██║╚██████╔╝
  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ 
  ═══════════════════════════════════════════════
`;

const WELCOME_MSG = `
  Welcome to SkyVault! 🔐
  
  Your secure, local-first secret manager.
  Store API keys, passwords, and sensitive data safely.
`;

const FEATURES = [
    { emoji: '🔒', title: 'Military-Grade Encryption', desc: 'AES-256-GCM with PBKDF2 key derivation' },
    { emoji: '💻', title: 'Local-First', desc: 'No cloud, works offline forever' },
    { emoji: '🎯', title: 'Developer-Friendly', desc: 'Namespaces, environments, easy CLI' },
    { emoji: '🛡️', title: 'Secure by Default', desc: 'Secrets encrypted at rest, auto-lock' }
];

export async function runOnboarding() {
    if (!isFirstRun()) {
        return false; // Not first run
    }

    console.log(chalk.cyan(LOGO));
    console.log(chalk.bold.green(WELCOME_MSG));

    console.log('\n  Why SkyVault?\n');
    for (const f of FEATURES) {
        console.log(`    ${f.emoji} ${chalk.bold(f.title)}`);
        console.log(`       ${f.desc}\n`);
    }

    console.log(chalk.dim('─'.repeat(60)));

    const { getStarted } = await inquirer.prompt([{
        type: 'confirm',
        name: 'getStarted',
        message: 'Ready to get started?',
        default: true
    }]);

    if (!getStarted) {
        console.log('\n  No problem! Run "skv vault init" whenever you\'re ready.\n');
        return false;
    }

    // Step 1: Create master password
    console.log('\n' + chalk.bold('📝 Step 1: Create Your Master Password\n'));

    const { password } = await inquirer.prompt([{
        type: 'password',
        name: 'password',
        message: 'Enter a strong master password:',
        mask: '●',
        validate: (input) => {
            if (!input || input.length < 8) {
                return 'Password must be at least 8 characters';
            }
            return true;
        }
    }]);

    const { confirm } = await inquirer.prompt([{
        type: 'password',
        name: 'confirm',
        message: 'Confirm your master password:',
        mask: '●',
        validate: (input) => {
            if (input !== password) {
                return 'Passwords do not match';
            }
            return true;
        }
    }]);

    console.log('\n' + chalk.bold('🔐 Step 2: Setting up your vault...\n'));

    try {
        const { vault, key } = await initVault(password);
        createSession(key);

        console.log(chalk.green('  ✓ Vault created successfully!\n'));

        // Show important info
        header('📍 Vault Location');
        console.log(`    ${VAULT_FILE}\n`);

        header('⚠️ Important Security Notes');
        console.log('    • Your master password cannot be recovered');
        console.log('    • Keep your password safe');
        console.log('    • The vault auto-locks after 15 minutes');
        console.log('    • Run "skv vault lock" to lock manually\n');

        // Quick tutorial
        const { seeTutorial } = await inquirer.prompt([{
            type: 'confirm',
            name: 'seeTutorial',
            message: 'Would you like a quick tutorial?',
            default: true
        }]);

        if (seeTutorial) {
            printTutorial();
        }

        return true;

    } catch (e) {
        error('Failed to create vault: ' + e.message);
        return false;
    }
}

function printTutorial() {
    header('🚀 Quick Tutorial');

    console.log(`
  Adding your first secret:
  
    ${chalk.cyan('skv add my-api-key')}
    ${chalk.dim('→ Enter your API key when prompted')}
    
    ${chalk.cyan('skv add github --template')}
    ${chalk.dim('→ Use a template for common services')}
    
    ${chalk.cyan('skv add db-password --generate')}
    ${chalk.dim('→ Auto-generate a secure password')}
  
  Retrieving secrets:
  
    ${chalk.cyan('skv get my-api-key')}
    ${chalk.dim('→ View your secret (masked)')}
    
    ${chalk.cyan('skv get my-api-key --copy')}
    ${chalk.dim('→ Copy to clipboard (auto-clears after 30s)')}
    
    ${chalk.cyan('skv get my-api-key --raw')}
    ${chalk.dim('→ Show actual value')}
  
  Other useful commands:
  
    ${chalk.cyan('skv dashboard')}
    ${chalk.dim('→ See all secrets and expiration status')}
    
    ${chalk.cyan('skv list')}
    ${chalk.dim('→ List all secrets')}
    
    ${chalk.cyan('skv import-env .env')}
    ${chalk.dim('→ Import from .env file')}
    
    ${chalk.cyan('skv run -- node app.js')}
    ${chalk.dim('→ Run command with secrets as env vars')}
  `);

    console.log(chalk.green('  You\'re all set! Happy coding! 🎉\n'));
}

export function registerOnboarding(program) {
    // No command to register - this runs automatically
}
