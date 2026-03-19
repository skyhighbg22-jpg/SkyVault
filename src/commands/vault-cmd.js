import inquirer from 'inquirer';
import { initVault, loadVault, saveVault, vaultExists, acquireLock, releaseLock, VAULT_FILE } from '../core/encrypted-vault.js';
import { createSession, destroySession, hasSession, getSessionInfo } from '../core/session.js';
import { success, error, info, warning } from '../ui/output.js';
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
          error('Vault not initialized. Run "skv vault init" first.');
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
          error('Vault not initialized');
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
    .description('Show vault status')
    .action(async () => {
      try {
        if (!vaultExists()) {
          info('No vault initialized');
          info('Run "skv vault init" to create one');
          return;
        }
        
        const stats = fs.statSync(VAULT_FILE);
        
        console.log('\nVault Status');
        console.log('=' .repeat(40));
        console.log(`Location: ${VAULT_FILE}`);
        console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`Created: ${stats.birthtime.toISOString()}`);
        console.log(`Modified: ${stats.mtime.toISOString()}`);
        
        if (hasSession()) {
          const sessionInfo = getSessionInfo();
          console.log(`\nStatus: ${'\x1b[32m'}UNLOCKED${'\x1b[0m'}`);
          if (sessionInfo) {
            console.log(`Session expires: ${sessionInfo.expires}`);
            console.log(`Remaining: ${Math.floor(sessionInfo.remainingSeconds / 60)} minutes`);
          }
        } else {
          console.log(`\nStatus: ${'\x1b[31m'}LOCKED${'\x1b[0m'}`);
          console.log('Run "skv vault unlock" to access secrets');
        }
        
        console.log('');
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
