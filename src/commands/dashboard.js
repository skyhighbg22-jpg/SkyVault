import { loadVault, listSecrets } from '../core/vault.js';
import { hasSession } from '../core/session.js';
import { header, info, error, success, warning, createTable, printTable, formatExpiry, isExpired } from '../ui/output.js';

export function registerDashboard(program) {
    program
        .command('dashboard')
        .alias('dash')
        .description('Show dashboard with secret overview and expiration status')
        .option('--ns <namespace>', 'Filter by namespace')
        .option('--env <environment>', 'Filter by environment')
        .option('--all', 'Show all namespaces and environments', false)
        .option('--json', 'Output as JSON', false)
        .action(async (options) => {
            try {
                // Check if vault is unlocked
                if (!hasSession()) {
                    error('Vault is locked. Run "skv vault unlock" first.');
                    process.exit(4);
                }

                const vault = loadVault();

                // Collect all secrets
                const allSecrets = [];
                const namespaces = options.all ? Object.keys(vault.namespaces) : [options.ns || 'default'];

                for (const ns of namespaces) {
                    const envs = options.all
                        ? Object.keys(vault.namespaces[ns] || {})
                        : [options.env || 'dev'];

                    for (const env of envs) {
                        const secrets = listSecrets(vault, ns, env);
                        for (const secret of secrets) {
                            allSecrets.push({
                                ...secret,
                                ns,
                                env,
                                fullName: `${ns}/${env}/${secret.name}`
                            });
                        }
                    }
                }

                if (allSecrets.length === 0) {
                    header('🔐 SkyVault Dashboard');
                    info('No secrets found in your vault.');
                    info('Run "skv quick-add" to add your first secret!');
                    return;
                }

                // Categorize by expiration status
                const now = new Date();
                const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

                const categories = {
                    expired: [],
                    expiringSoon: [],
                    healthy: [],
                    noExpiry: []
                };

                for (const secret of allSecrets) {
                    if (!secret.expires) {
                        categories.noExpiry.push(secret);
                    } else if (isExpired(secret.expires)) {
                        categories.expired.push(secret);
                    } else if (new Date(secret.expires) <= sevenDays) {
                        categories.expiringSoon.push(secret);
                    } else {
                        categories.healthy.push(secret);
                    }
                }

                // Summary stats
                const stats = {
                    total: allSecrets.length,
                    expired: categories.expired.length,
                    expiringSoon: categories.expiringSoon.length,
                    healthy: categories.healthy.length,
                    noExpiry: categories.noExpiry.length
                };

                if (options.json) {
                    console.log(JSON.stringify({
                        stats,
                        categories: {
                            expired: categories.expired.map(s => ({ name: s.fullName, expires: s.expires })),
                            expiringSoon: categories.expiringSoon.map(s => ({ name: s.fullName, expires: s.expires })),
                            healthy: categories.healthy.map(s => ({ name: s.fullName, expires: s.expires })),
                            noExpiry: categories.noExpiry.map(s => ({ name: s.fullName }))
                        }
                    }, null, 2));
                    return;
                }

                // Print dashboard
                printDashboard(stats, categories);

            } catch (e) {
                error(e.message);
                process.exit(1);
            }
        });
}

function printDashboard(stats, categories) {
    const { total, expired, expiringSoon, healthy, noExpiry } = stats;

    // Header with stats
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                         🔐 SkyVault Dashboard                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Secrets: ${total}  │  🔴 Expired: ${expired}  │  ⚠️ Expiring: ${expiringSoon}  │  ✅ Healthy: ${healthy}  ║`);
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Expired secrets
    if (categories.expired.length > 0) {
        console.log('  🔴 EXPIRED SECRETS');
        console.log('  ' + '─'.repeat(76));
        const table = createTable(['Secret', 'Expired', 'Location']);
        for (const secret of categories.expired) {
            const daysAgo = Math.floor((new Date() - new Date(secret.expires)) / (1000 * 60 * 60 * 24));
            table.push([
                secret.name,
                `${daysAgo}d ago`,
                `${secret.ns}/${secret.env}`
            ]);
        }
        printTable(table);
        console.log('');
    }

    // Expiring soon
    if (categories.expiringSoon.length > 0) {
        console.log('  ⚠️ EXPIRING WITHIN 7 DAYS');
        console.log('  ' + '─'.repeat(76));
        const table = createTable(['Secret', 'Expires In', 'Location']);
        for (const secret of categories.expiringSoon) {
            const daysUntil = Math.floor((new Date(secret.expires) - new Date()) / (1000 * 60 * 60 * 24));
            table.push([
                secret.name,
                `${daysUntil}d`,
                `${secret.ns}/${secret.env}`
            ]);
        }
        printTable(table);
        console.log('');
    }

    // Quick tips
    console.log('  💡 QUICK ACTIONS');
    console.log('  ' + '─'.repeat(76));
    console.log('    skv quick-add     → Add a new secret');
    console.log('    skv list         → View all secrets');
    console.log('    skv history      → View secret history');
    console.log('    skv backup       → Backup your vault');
    console.log('');
}
