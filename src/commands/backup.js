import fs from 'fs';
import path from 'path';
import os from 'os';
import ora from 'ora';
import { VAULT_DIR, VAULT_FILE } from '../core/vault.js';
import { success, error, info, createTable, printTable, formatDate } from '../ui/output.js';

const BACKUP_DIR = path.join(VAULT_DIR, 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export function registerBackup(program) {
  const backupCmd = program
    .command('backup')
    .description('Vault backup management');

  // Create backup
  backupCmd
    .command('create')
    .description('Create a backup of the current vault')
    .action(async () => {
      try {
        if (!fs.existsSync(VAULT_FILE)) {
          error('No vault to backup');
          process.exit(1);
        }

        const spinner = ora('Creating backup...').start();

        ensureBackupDir();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(BACKUP_DIR, `${timestamp}.vault`);

        try {
          fs.copyFileSync(VAULT_FILE, backupFile);
          spinner.succeed(`Backup created: ${path.basename(backupFile)}`);
        } catch (e) {
          spinner.fail('Backup failed');
          throw e;
        }

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // List backups
  backupCmd
    .command('list')
    .description('List all backups')
    .action(async () => {
      try {
        ensureBackupDir();

        const backups = fs.readdirSync(BACKUP_DIR)
          .filter(f => f.endsWith('.vault'))
          .map(f => {
            const stat = fs.statSync(path.join(BACKUP_DIR, f));
            return {
              name: f,
              size: (stat.size / 1024).toFixed(2) + ' KB',
              created: stat.birthtime
            };
          })
          .sort((a, b) => b.created - a.created);

        if (backups.length === 0) {
          info('No backups found');
          return;
        }

        const table = createTable(['Name', 'Size', 'Created']);
        backups.forEach(b => {
          table.push([b.name, b.size, formatDate(b.created)]);
        });

        printTable(table);
        info(`\n${backups.length} backup(s) found`);

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // Restore backup
  backupCmd
    .command('restore <name>')
    .description('Restore vault from backup')
    .option('--force', 'Skip confirmation', false)
    .action(async (name, options) => {
      try {
        const backupFile = path.join(BACKUP_DIR, name);

        if (!fs.existsSync(backupFile)) {
          error(`Backup '${name}' not found`);
          process.exit(2);
        }

        if (!options.force) {
          const inquirer = (await import('inquirer')).default;
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'This will replace the current vault. Continue?',
            default: false
          }]);

          if (!confirm) {
            info('Aborted');
            return;
          }
        }

        const spinner = ora('Restoring vault...').start();

        try {
          // Create backup of current vault first
          if (fs.existsSync(VAULT_FILE)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const currentBackup = path.join(BACKUP_DIR, `${timestamp}-pre-restore.vault`);
            fs.copyFileSync(VAULT_FILE, currentBackup);
          }

          fs.copyFileSync(backupFile, VAULT_FILE);
          spinner.succeed('Vault restored from backup');
        } catch (e) {
          spinner.fail('Restore failed');
          throw e;
        }

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });

  // Delete backup
  backupCmd
    .command('delete <name>')
    .description('Delete a backup')
    .action(async (name) => {
      try {
        const backupFile = path.join(BACKUP_DIR, name);

        if (!fs.existsSync(backupFile)) {
          error(`Backup '${name}' not found`);
          process.exit(2);
        }

        fs.unlinkSync(backupFile);
        success(`Deleted backup '${name}'`);

      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
