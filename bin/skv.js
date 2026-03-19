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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  fs.readFileSync(join(__dirname, '../package.json'), 'utf8')
);

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
  .option('--no-color', 'Disable colors');

// Register all commands
registerAdd(program);
registerGet(program);
registerList(program);
registerRemove(program);
registerContext(program);
registerFind(program);
registerGenerate(program);
registerDoctor(program);

program.parse();
