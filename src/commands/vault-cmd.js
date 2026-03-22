import inquirer from 'inquirer';
import { initVault, loadVault, saveVault, vaultExists, acquireLock, releaseLock, VAULT_FILE } from '../core/encrypted-vault.js';
import { createSession, destroySession, hasSession, getSessionInfo } from '../core/session.js';
import { success, error, info, warning, vaultError } from '../ui/output.js';
import fs from 'fs';

export function registerVault(program) {
  const vaultCmd = program
    .command('vault')
    .description('Vault lifecycle management');

  // Initialize vault
  vaultCmd
    .command('init')
    .description('Initialize a new encrypted vault')
    .action(async () => {
      try {
        if (vaultExists()) {
          warning('Vault already exists. Use "skv vault set-password" to change password.');
          return;
        }

        // Prompt for master password
        const { password } = await inquirer.prompt([{
          type: 'password',
          name: 'password',
          message: 'Set master password:',
          mask: '*',
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
          message: 'Confirm master password:',
          mask: '*',
          validate: (input) => {
            if (input !== password) {
              return 'Passwords do not match';
            }
            return true;
          }
        }]);

        info('Initializing vault...');
        const { vault, key } = await initVault(password);

        // Create session
        const token = createSession(key);

        success('Vault initialized successfully!');
        info(`Location: ${VAULT_FILE}`);
        info('Session active for 15 minutes');

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // Unlock vault
  vaultCmd
    .command('unlock')
    .description('Unlock the vault and start a session')
    .action(async () => {
      try {
        if (!vaultExists()) {
          vaultError('Vault not initialized', { notInitialized: true });
          process.exit(4);
        }

        if (hasSession()) {
          warning('Vault is already unlocked');
          const sessionInfo = getSessionInfo();
          if (sessionInfo) {
            info(`Session expires: ${sessionInfo.expires}`);
          }
          return;
        }

        // Prompt for master password
        const { password } = await inquirer.prompt([{
          type: 'password',
          name: 'password',
          message: 'Master password:',
          mask: '*'
        }]);

        info('Unlocking vault...');
        const { vault, key } = await loadVault(password);

        // Create session
        const token = createSession(key);

        success('Vault unlocked successfully!');
        info('Session active for 15 minutes');

      } catch (e) {
        if (e.message.includes('Vault integrity check failed')) {
          error('Wrong password or corrupted vault file');
          process.exit(9);
        }
        error(e.message);
        process.exit(1);
      }
    });

  // Lock vault
  vaultCmd
    .command('lock')
    .description('Lock the vault and destroy session')
    .action(async () => {
      try {
        if (!hasSession()) {
          warning('Vault is already locked');
          return;
        }

        destroySession();
        success('Vault locked');

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // Set password
  vaultCmd
    .command('set-password')
    .description('Change the vault master password')
    .action(async () => {
      try {
        if (!vaultExists()) {
          vaultError('Vault not initialized', { notInitialized: true });
          process.exit(4);
        }

        if (!hasSession()) {
          error('Vault is locked. Run "skv vault unlock" first.');
          process.exit(4);
        }

        // This requires re-authentication
        const { currentPassword } = await inquirer.prompt([{
          type: 'password',
          name: 'currentPassword',
          message: 'Current master password:',
          mask: '*'
        }]);

        // Load with current password to verify
        const { vault, key } = await loadVault(currentPassword);

        // Prompt for new password
        const { newPassword } = await inquirer.prompt([{
          type: 'password',
          name: 'newPassword',
          message: 'New master password:',
          mask: '*',
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
          message: 'Confirm new master password:',
          mask: '*',
          validate: (input) => {
            if (input !== newPassword) {
              return 'Passwords do not match';
            }
            return true;
          }
        }]);

        info('Re-encrypting vault...');

        // Re-initialize with new password
        const { vault: newVault, key: newKey } = await initVault(newPassword);

        // Copy data to new vault
        newVault.namespaces = vault.namespaces;

        // Save with new key
        await saveVault(newVault, newKey);

        // Create new session
        destroySession();
        createSession(newKey);

        success('Password changed successfully!');
        info('Vault re-encrypted with new password');

      } catch (e) {
        if (e.message.includes('Vault integrity check failed')) {
          error('Wrong current password');
          process.exit(9);
        }
        error(e.message);
        process.exit(1);
      }
    });

  // Vault status
  vaultCmd
    .command('status')
    .alias('info')
    .description('Show vault status with quick actions')
    .action(async () => {
      try {
        if (!vaultExists()) {
          header('🔐 SkyVault Status');
          info('No vault initialized');
          info('\n💡 Quick start:');
          console.log('   skv vault init     → Create your vault');
          console.log('   skv --help         → See all commands');
          return;
        }

        const stats = fs.statSync(VAULT_FILE);

        // Check for Unicode terminal support
        const useUnicode = process.stdout.isTTY && !process.env.CLI_COLORS_FORCE_ASCII;

        // Define box characters based on terminal support
        const box = useUnicode ? {
          tl: '╔', tm: '═', tr: '╗',
          ml: '╠', mr: '╣',
          bl: '╚', bm: '═', br: '╝',
          v: '║', h: '═'
        } : {
          tl: '+', tm: '=', tr: '+',
          ml: '+', mr: '+',
          bl: '+', bm: '=', br: '+',
          v: '|', h: '='
        };

        // Print rich status
        console.log('');
        console.log(`${box.tl}${box.tm.repeat(75)}${box.tr}`);
        console.log(`${box.v}                         🔐 SkyVault Status                                 ${box.v}`);
        console.log(`${box.ml}${box.tm.repeat(75)}${box.mr}`);
        console.log(`${box.v}  Location:    ${VAULT_FILE.padEnd(62)}${box.v}`);
        console.log(`${box.v}  Size:        ${(stats.size / 1024).toFixed(2)} KB`.padEnd(76) + `${box.v}`);

        // Show secret info without loading entire vault
        // Use 'skv list' to see all secrets when unlocked
        let secretsInfo = 'N/A (unlock to count)';
        let providersInfo = 'N/A';

        if (hasSession()) {
          secretsInfo = 'Use "skv list" to view';
          providersInfo = '-';
        }

        console.log(`${box.v}  Secrets:     ${secretsInfo}`.padEnd(76) + `${box.v}`);
        console.log(`${box.v}  Providers:   ${providersInfo}`.padEnd(76) + `${box.v}`);

        if (hasSession()) {
          const sessionInfo = getSessionInfo();
          const minsLeft = Math.floor(sessionInfo.remainingSeconds / 60);
          console.log(`${box.ml}${box.tm.repeat(75)}${box.mr}`);
          console.log(`${box.v}  Status:      🔓 UNLOCKED`.padEnd(76) + `${box.v}`);
          console.log(`${box.v}  Session:     ${minsLeft} minutes remaining`.padEnd(76) + `${box.v}`);
        } else {
          console.log(`${box.ml}${box.tm.repeat(75)}${box.mr}`);
          console.log(`${box.v}  Status:      🔒 LOCKED`.padEnd(76) + `${box.v}`);
        }

        console.log(`${box.bl}${box.bm.repeat(75)}${box.br}`);

        // Quick actions
        console.log('\n  💡 Quick Actions:');
        console.log('  ' + '-'.repeat(76));

        if (hasSession()) {
          console.log('    skv list         → View all secrets');
          console.log('    skv quick-add    → Add a new secret');
          console.log('    skv dashboard    → See expiration status');
          console.log('    skv vault lock   → Lock the vault');
        } else {
          console.log('    skv vault unlock → Unlock the vault');
          console.log('    skv vault init   → Initialize vault (first time)');
        }

        console.log('    skv backup       → Backup your vault');
        console.log('    skv doctor       → Check environment');
        console.log('');

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
