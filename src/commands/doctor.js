import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { vaultExists, VAULT_FILE } from '../core/vault.js';

export function registerDoctor(program) {
  program
    .command('doctor')
    .description('Check environment health')
    .action(async () => {
      const checks = [];
      
      // Check 1: Vault file exists
      checks.push({
        name: 'Vault file exists',
        status: vaultExists(),
        details: vaultExists() ? VAULT_FILE : 'Not initialized'
      });
      
      // Check 2: Vault permissions (Unix only)
      let permissionsOk = true;
      if (vaultExists() && process.platform !== 'win32') {
        try {
          const stats = fs.statSync(VAULT_FILE);
          const mode = stats.mode & 0o777;
          permissionsOk = mode === 0o600;
          checks.push({
            name: 'Vault permissions (600)',
            status: permissionsOk,
            details: permissionsOk ? `OK (${mode.toString(8)})` : `Incorrect (${mode.toString(8)})`
          });
        } catch (e) {
          checks.push({
            name: 'Vault permissions',
            status: false,
            details: e.message
          });
        }
      } else {
        checks.push({
          name: 'Vault permissions',
          status: true,
          details: process.platform === 'win32' ? 'Skipped on Windows' : 'Vault not initialized'
        });
      }
      
      // Check 3: Node.js version
      const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
      checks.push({
        name: 'Node.js version >= 18',
        status: nodeVersion >= 18,
        details: process.version
      });
      
      // Check 4: GPG in PATH
      let gpgOk = false;
      try {
        execSync('gpg --version', { stdio: 'ignore' });
        gpgOk = true;
      } catch (e) {
        // GPG not found
      }
      checks.push({
        name: 'GPG available',
        status: gpgOk,
        details: gpgOk ? 'Found' : 'Not in PATH'
      });
      
      // Check 5: Git in PATH
      let gitOk = false;
      try {
        execSync('git --version', { stdio: 'ignore' });
        gitOk = true;
      } catch (e) {
        // Git not found
      }
      checks.push({
        name: 'Git available',
        status: gitOk,
        details: gitOk ? 'Found' : 'Not in PATH'
      });
      
      // Check 6: No stale lock file
      const lockFile = VAULT_FILE + '.lock';
      let lockOk = true;
      let lockDetails = 'No lock file';
      if (fs.existsSync(lockFile)) {
        try {
          const pid = parseInt(fs.readFileSync(lockFile, 'utf8'));
          try {
            process.kill(pid, 0);
            lockOk = false;
            lockDetails = `Active lock by PID ${pid}`;
          } catch (e) {
            lockDetails = `Stale lock file (PID ${pid} not running)`;
          }
        } catch (e) {
          lockDetails = 'Corrupt lock file';
        }
      }
      checks.push({
        name: 'No stale lock file',
        status: lockOk,
        details: lockDetails
      });
      
      // Print results
      console.log('\nEnvironment Health Check');
      console.log('=' .repeat(50));
      
      let passed = 0;
      checks.forEach(check => {
        const symbol = check.status ? '✓' : '✗';
        const color = check.status ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';
        console.log(`${color}${symbol}${reset} ${check.name}`);
        console.log(`  ${check.details}`);
      });
      
      passed = checks.filter(c => c.status).length;
      const total = checks.length;
      
      console.log('\n' + '=' .repeat(50));
      console.log(`${passed}/${total} checks passed`);
      
      if (passed < total) {
        process.exit(1);
      }
    });
}
