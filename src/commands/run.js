import { spawn } from 'child_process';
import { loadVault, getSecret } from '../core/vault.js';
import { success, error } from '../ui/output.js';

export function registerRun(program) {
  program
    .command('run')
    .description('Run a command with secrets injected as environment variables')
    .option('--use <mapping>', 'Secret to env var mapping (name=VAR)', [])
    .option('--ns <namespace>', 'Source namespace', 'default')
    .option('--env <environment>', 'Source environment', 'dev')
    .option('--all', 'Inject all secrets', false)
    .allowUnknownOption()
    .action(async (options, command) => {
      try {
        const vault = loadVault();
        const env = { ...process.env };
        
        // Parse --use mappings
        const mappings = Array.isArray(options.use) ? options.use : [options.use];
        
        if (options.all) {
          // Inject all secrets
          for (const [nsName, ns] of Object.entries(vault.namespaces)) {
            if (nsName !== options.ns) continue;
            for (const [envName, environment] of Object.entries(ns)) {
              if (envName !== options.env) continue;
              for (const [secretName, secret] of Object.entries(environment)) {
                // Convert secret name to env var format
                const varName = secretName.toUpperCase().replace(/-/g, '_');
                env[varName] = secret.value;
              }
            }
          }
        } else {
          // Inject specified secrets
          for (const mapping of mappings) {
            if (!mapping) continue;
            
            const [secretName, varName] = mapping.split('=');
            if (!secretName) continue;
            
            const targetVar = varName || secretName.toUpperCase().replace(/-/g, '_');
            const secret = getSecret(vault, options.ns, options.env, secretName);
            
            if (!secret) {
              error(`Secret '${secretName}' not found`);
              process.exit(2);
            }
            
            env[targetVar] = secret.value;
          }
        }
        
        // Get the command to run (everything after --)
        const cmdIndex = process.argv.indexOf('--');
        if (cmdIndex === -1 || cmdIndex === process.argv.length - 1) {
          error('No command specified. Use "skv run -- <command> [args...]"');
          process.exit(1);
        }
        
        const cmd = process.argv[cmdIndex + 1];
        const args = process.argv.slice(cmdIndex + 2);
        
        // Spawn the command
        const child = spawn(cmd, args, {
          stdio: 'inherit',
          env: env
        });
        
        child.on('exit', (code) => {
          process.exit(code);
        });
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
