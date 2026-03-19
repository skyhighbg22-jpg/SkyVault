import crypto from 'crypto';
import { success, error, info, printRaw } from '../ui/output.js';
import clipboardy from 'clipboardy';

export function registerGenerate(program) {
  program
    .command('generate')
    .description('Generate a secure random secret')
    .option('--length <length>', 'Secret length', '32')
    .option('--no-special', 'Exclude special characters', false)
    .option('--raw', 'Output without formatting', false)
    .option('--copy', 'Copy to clipboard', false)
    .action(async (options) => {
      try {
        const length = parseInt(options.length);
        
        if (isNaN(length) || length < 1 || length > 1000) {
          error('Length must be between 1 and 1000');
          process.exit(1);
        }
        
        let charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        if (!options.noSpecial) {
          charset += '!@#$%^&*';
        }
        
        let result = '';
        const randomBytes = crypto.randomBytes(length * 2);
        
        for (let i = 0; i < length; i++) {
          result += charset[randomBytes[i] % charset.length];
        }
        
        if (options.copy) {
          clipboardy.writeSync(result);
          success(`Generated ${length}-character secret copied to clipboard`);
        } else if (options.raw) {
          printRaw(result);
        } else {
          console.log(`\nGenerated Secret (${length} chars):`);
          console.log(result);
          console.log('\n');
          info('Use --copy to copy to clipboard');
        }
        
      } catch (e) {
        error(e.message);
        process.exit(1);
      }
    });
}
