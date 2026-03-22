import inquirer from 'inquirer';
import { loadVault, getSecret, saveVault, setSecret } from '../core/vault.js';
import { createShare, receiveShare, createShareLink, parseShareLink } from '../core/share.js';
import { hasSession } from '../core/session.js';
import { success, error, info, header, authError } from '../ui/output.js';
import clipboardy from 'clipboardy';

export function registerShare(program) {
    const shareCmd = program
        .command('share')
        .description('Share secrets securely with team members');

    // Share a secret
    shareCmd
        .command('create <name>')
        .description('Create a secure share for a secret')
        .option('--ns <namespace>', 'Target namespace', 'default')
        .option('--env <environment>', 'Target environment', 'dev')
        .option('--expires <expiry>', 'Share expiration (1h, 24h, 7d)')
        .option('--copy', 'Copy share link to clipboard', false)
        .action(async (name, options) => {
            try {
                // Check if vault is unlocked
                if (!hasSession()) {
                    authError('Vault is locked', { locked: true });
                    process.exit(4);
                }

                const vault = loadVault();

                // Get secret
                const secret = getSecret(vault, options.ns, options.env, name);
                if (!secret) {
                    error(`Secret '${name}' not found in ${options.ns}/${options.env}`);
                    process.exit(2);
                }

                // Prompt for share password
                const { password } = await inquirer.prompt([{
                    type: 'password',
                    name: 'password',
                    message: 'Set a share password:',
                    mask: '●',
                    validate: (input) => {
                        if (!input || input.length < 6) {
                            return 'Password must be at least 6 characters';
                        }
                        return true;
                    }
                }]);

                const { confirm } = await inquirer.prompt([{
                    type: 'password',
                    name: 'confirm',
                    message: 'Confirm share password:',
                    mask: '●',
                    validate: (input) => {
                        if (input !== password) {
                            return 'Passwords do not match';
                        }
                        return true;
                    }
                }]);

                // Create share
                info('🔐 Creating encrypted share...');
                const { shareCode, expires } = await createShare(secret, password, { expires: options.expires });
                const shareLink = createShareLink(shareCode);

                // Display share
                header('📤 Secret Share Created');

                console.log(`\n  Secret:     ${name}`);
                console.log(`  Type:       ${secret.type || 'secret'}`);
                console.log(`  Provider:   ${secret.provider || '-'}`);

                if (expires) {
                    console.log(`  Expires:    ${new Date(expires).toLocaleString()}`);
                } else {
                    console.log(`  Expires:    Never`);
                }

                console.log(`\n  🔗 Share Link:`);
                console.log(`     ${shareLink}`);

                console.log(`\n  ⚠️  Share this link and password securely with your team member.`);
                console.log(`     The recipient will need both to decrypt the secret.`);

                // Handle clipboard - auto-copy if --copy flag is passed, otherwise prompt in interactive mode
                if (options.copy) {
                    // Explicit --copy flag: auto-copy without prompting
                    try {
                        clipboardy.writeSync(shareLink);
                        success('Share link copied to clipboard!');
                    } catch (err) {
                        info('Could not copy to clipboard. Please copy manually:');
                        console.log(shareLink);
                    }
                } else if (process.stdout.isTTY) {
                    // Interactive mode: prompt for confirmation
                    const { copyLink } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'copyLink',
                        message: 'Copy share link to clipboard?',
                        default: true
                    }]);

                    if (copyLink) {
                        try {
                            clipboardy.writeSync(shareLink);
                            success('Share link copied to clipboard!');
                        } catch (err) {
                            info('Could not copy to clipboard. Please copy manually:');
                            console.log(shareLink);
                        }
                    }
                }

            } catch (e) {
                error(e.message);
                process.exit(1);
            }
        });

    // Receive a shared secret
    shareCmd
        .command('receive')
        .description('Import a shared secret')
        .option('--ns <namespace>', 'Target namespace', 'default')
        .option('--env <environment>', 'Target environment', 'dev')
        .option('--name <name>', 'Target secret name')
        .action(async (options) => {
            try {
                // Check if vault is unlocked
                if (!hasSession()) {
                    authError('Vault is locked', { locked: true });
                    process.exit(4);
                }

                // Get share link/code
                const { shareInput } = await inquirer.prompt([{
                    type: 'input',
                    name: 'shareInput',
                    message: 'Enter share link or code:',
                    validate: (input) => {
                        if (!input || input.length < 10) {
                            return 'Please enter a valid share link or code';
                        }
                        return true;
                    }
                }]);

                // Parse link if provided
                let shareCode = shareInput;
                if (shareInput.includes('://')) {
                    const parsed = parseShareLink(shareInput);
                    if (!parsed) {
                        error('Invalid share link format');
                        process.exit(1);
                    }
                    shareCode = parsed;
                }

                // Get share password
                const { password } = await inquirer.prompt([{
                    type: 'password',
                    name: 'password',
                    message: 'Enter share password:',
                    mask: '●'
                }]);

                // Decrypt share
                info('🔐 Decrypting shared secret...');

                let secretData;
                try {
                    secretData = await receiveShare(shareCode, password);
                } catch (e) {
                    error('Failed to decrypt: Invalid password or corrupted share');
                    process.exit(1);
                }

                // Ask for secret name
                const targetName = options.name || secretData.name;
                const { confirmName } = await inquirer.prompt([{
                    type: 'input',
                    name: 'confirmName',
                    message: 'Secret name:',
                    default: targetName
                }]);

                // Load vault
                const vault = loadVault();

                // Check if exists
                const existing = vault.namespaces[options.ns]?.[options.env]?.[confirmName];
                if (existing) {
                    const { overwrite } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'overwrite',
                        message: `Secret '${confirmName}' already exists. Overwrite?`,
                        default: false
                    }]);

                    if (!overwrite) {
                        info('Cancelled');
                        return;
                    }
                }

                // Save to vault (preserve expiration from shared data)
                setSecret(vault, options.ns, options.env, confirmName, {
                    value: secretData.value,
                    type: secretData.type,
                    provider: secretData.provider,
                    description: secretData.description ? `${secretData.description} (shared)` : 'Shared secret',
                    tags: [...(secretData.tags || []), 'shared'],
                    expires: secretData.expires || null,
                    meta: {
                        sharedFrom: secretData.created,
                        sharedVia: 'skv-share'
                    }
                });

                saveVault(vault);

                header('✅ Secret Received!');
                console.log(`\n  Name:       ${confirmName}`);
                console.log(`  Type:       ${secretData.type || 'secret'}`);
                console.log(`  Provider:   ${secretData.provider || '-'}`);
                console.log(`  Location:   ${options.ns}/${options.env}`);

                info('\nThe secret has been added to your vault.');

            } catch (e) {
                error(e.message);
                process.exit(1);
            }
        });

    // List recent shares
    shareCmd
        .command('history')
        .description('Show share history')
        .action(async () => {
            // This would require storing share metadata
            info('Share history feature coming soon!');
            info('Currently, shares are ephemeral and not tracked.');
        });
}
