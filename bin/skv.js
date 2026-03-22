#!/usr/bin/env node

import { program } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import { registerAdd } from '../src/commands/add.js';
import { registerGet } from '../src/commands/get.js';
import { registerList } from '../src/commands/list.js';
import { registerRemove } from '../src/commands/remove.js';
import { registerContext } from '../src/commands/context.js';
import { registerFind } from '../src/commands/find.js';
import { registerGenerate } from '../src/commands/generate.js';
import { registerDoctor } from '../src/commands/doctor.js';
import { registerVault } from '../src/commands/vault-cmd.js';
import { registerHistory, registerRollback, registerRotate } from '../src/commands/history.js';
import { registerBackup } from '../src/commands/backup.js';
import { registerImport } from '../src/commands/import-cmd.js';
import { registerExport } from '../src/commands/export-cmd.js';
import { registerRun } from '../src/commands/run.js';
import { registerTemplates } from '../src/commands/templates.js';
import { registerImportEnv } from '../src/commands/import-env.js';
import { registerQuickAdd } from '../src/commands/quick-add.js';
import { registerDashboard } from '../src/commands/dashboard.js';
import { runOnboarding } from '../src/commands/onboarding.js';
import { registerShare } from '../src/commands/share.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  fs.readFileSync(join(__dirname, '../package.json'), 'utf8')
);

// ASCII Banner
const banner = `
███████╗██╗  ██╗██╗   ██╗██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
██╔════╝██║ ██╔╝╚██╗ ██╔╝╚██╗ ██╔╝██╔══██╗██║   ██║██║  ╚══██╔══╝
███████╗█████╔╝  ╚████╔╝  ╚████╔╝ ███████║██║   ██║██║     ██║   
╚════██║██╔═██╗   ╚██╔╝    ╚██╔╝  ██╔══██║██║   ██║██║     ██║   
███████║██║  ██╗   ██║      ██║   ██║  ██║╚██████╔╝███████╗██║   
╚══════╝╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   
`;

program
  .name('skv')
  .description('SkyVault - Local-first CLI secret manager')
  .version(packageJson.version)
  .option('--ns <namespace>', 'Target namespace', 'default')
  .option('--env <environment>', 'Target environment', 'dev')
  .option('--raw', 'Output unmasked secret value', false)
  .option('--copy', 'Send output to clipboard', false)
  .option('--json', 'Machine-readable JSON output', false)
  .option('--quiet, -q', 'Suppress all non-essential output', false)
  .option('--verbose, -v', 'Print debug trace output', false)
  .option('--no-color', 'Disable colors')
  .option('--no-onboarding, -s', 'Skip onboarding');

// Register all commands
registerAdd(program);
registerGet(program);
registerList(program);
registerRemove(program);
registerContext(program);
registerFind(program);
registerGenerate(program);
registerDoctor(program);
registerVault(program);
registerHistory(program);
registerRollback(program);
registerRotate(program);
registerBackup(program);
registerImport(program);
registerExport(program);
registerRun(program);
registerTemplates(program);
registerImportEnv(program);
registerQuickAdd(program);
registerDashboard(program);
registerShare(program);

// Get home directory for storing state files
// Note: The onboarding flag file location is intentionally scoped to the user's home
// directory by default. This ensures onboarding runs once per user installation.
//
// For multi-vault users or portable installations, override using:
//   SKV_ONBOARDED_FILE=/path/to/flagfile (absolute path)
//   SKV_VAULT_DIR=/custom/vault/path  (scopes flag to vault location)
//
// The flag file prevents repeated onboarding prompts across CLI invocations.
const homeDir = process.env.HOME || process.env.USERPROFILE || process.env.APPDATA;

// Validate homeDir is available, otherwise skip onboarding silently
if (!homeDir) {
  if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
    console.error('[skv] Warning: Could not determine home directory. Onboarding skipped.');
  }
  // Skip onboarding by setting a flag to indicate it should be skipped
  process.env.SKV_ONBOARDING_DISABLED = 'true';
}

// Support custom flag file location via environment variable
let onboardingFlagFile;
if (process.env.SKV_ONBOARDED_FILE) {
  onboardingFlagFile = process.env.SKV_ONBOARDED_FILE;
} else if (process.env.SKV_VAULT_DIR) {
  // Scope flag file to vault directory for multi-vault setups
  onboardingFlagFile = join(process.env.SKV_VAULT_DIR, '.skv-onboarded');
} else {
  // Default: use home directory
  onboardingFlagFile = join(homeDir, '.skv-onboarded');
}

// Session-level guard to prevent multiple onboarding runs in the same process
let hasOnboardingRunInSession = false;

// Show banner on CLI start (unless --quiet flag is passed)
const showBanner = () => {
  const args = process.argv.slice(2);
  const quiet = args.includes('--quiet') || args.includes('-q') || args.includes('--json');
  if (!quiet && args.length === 0) {
    console.log(banner);
  }
};

// Hook into commander to run onboarding after command is parsed
// This ensures onboarding only runs when appropriate and after vault check
program.hook('preAction', async (thisCommand) => {
  // Use Commander's parsed options instead of scanning process.argv
  const opts = program.opts();
  // Check both programmatic option and CLI flags
  const skipOnboarding = opts.onboarding === false ||
    process.argv.includes('--no-onboarding') ||
    process.argv.includes('-s');
  if (skipOnboarding) return;

  // Skip if home directory couldn't be determined
  if (process.env.SKV_ONBOARDING_DISABLED === 'true') return;

  // Session-level guard: don't run if already attempted in this session
  if (hasOnboardingRunInSession) return;

  // Skip onboarding if already completed (check flag file)
  if (fs.existsSync(onboardingFlagFile)) {
    // Check if it was in-progress (interrupted) - allow retry
    try {
      const content = fs.readFileSync(onboardingFlagFile, 'utf8');
      if (content !== 'in-progress') {
        return; // Already completed
      }
      // Continue - was interrupted, allow retry
    } catch (e) {
      return; // Can't read, skip to be safe
    }
  }

  // Get the command name that will be executed
  const commandName = thisCommand.args[0] || thisCommand.name();

  // Skip onboarding for certain commands
  const skipCommands = ['--help', '--version', 'help', 'version'];
  if (skipCommands.includes(commandName)) return;
  if (commandName.startsWith('-')) return;

  // Mark that we're attempting onboarding now to prevent re-entry
  hasOnboardingRunInSession = true;

  // Create flag file BEFORE running onboarding to prevent repeated runs
  // If onboarding fails/is skipped, flag remains so it won't run again
  try {
    fs.writeFileSync(onboardingFlagFile, 'in-progress');
  } catch (e) {
    // Continue even if flag file can't be created (e.g., permission issues)
    if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
      console.error('[skv] Warning: Could not create onboarding flag file:', e.message);
    }
  }

  let onboardingResult;
  try {
    onboardingResult = await runOnboarding();
  } catch (e) {
    // Continue anyway - onboarding failure shouldn't block commands
    // Log in verbose mode for debugging
    if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
      console.error('[skv] Onboarding error:', e.message);
    }
  }

  // Update flag file based on result
  if (onboardingResult === false) {
    // Onboarding was skipped or not needed - mark as complete so it doesn't run again
    try {
      fs.writeFileSync(onboardingFlagFile, new Date().toISOString());
    } catch (e) {
      // Ignore - flag file is not critical
    }
  } else {
    // Onboarding succeeded - mark as complete with timestamp
    try {
      fs.writeFileSync(onboardingFlagFile, new Date().toISOString());
    } catch (e) {
      // Ignore - flag file is not critical
    }
  }
});

// Show banner on startup
showBanner();

program.parse();
