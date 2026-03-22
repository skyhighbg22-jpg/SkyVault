import { getTemplateNames, getTemplateInfo, getTemplatesByCategory, suggestTemplates } from '../utils/templates.js';
import { createTable, printTable, header, info } from '../ui/output.js';

export function registerTemplates(program) {
    const templatesCmd = program
        .command('templates')
        .description('List and manage secret templates')
        .alias('template')
        .alias('tmpl');

    // List all templates
    templatesCmd
        .command('list')
        .description('List all available templates')
        .option('--category <category>', 'Filter by category (cloud, ai, git, payment, database, etc.)')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            try {
                const templateNames = getTemplateNames();

                if (options.json) {
                    const templates = {};
                    for (const name of templateNames) {
                        templates[name] = getTemplateInfo(name);
                    }
                    console.log(JSON.stringify(templates, null, 2));
                    return;
                }

                // Group templates by category
                const categories = getTemplatesByCategory();

                if (options.category) {
                    // Show specific category
                    const categoryTemplates = categories[options.category];
                    if (!categoryTemplates) {
                        const validCategories = Object.keys(categories).join(', ');
                        info(`Invalid category. Valid categories: ${validCategories}`);
                        return;
                    }

                    header(`📦 ${options.category.toUpperCase()} Templates`);

                    const table = createTable(['Template', 'Type', 'Description', 'Default Expiry']);
                    for (const name of categoryTemplates) {
                        const t = getTemplateInfo(name);
                        table.push([name, t.type, t.description, t.defaultExpiry]);
                    }
                    printTable(table);
                } else {
                    // Show all categories
                    header('📦 Available Templates');

                    for (const [category, templateList] of Object.entries(categories)) {
                        info(`\n${getCategoryEmoji(category)} ${category}:`);
                        const table = createTable(['Template', 'Description']);
                        for (const name of templateList) {
                            const t = getTemplateInfo(name);
                            table.push([name, t.description]);
                        }
                        printTable(table);
                    }

                    info('\n💡 Use --category to filter, or run "skv templates show <name>" for details');
                }

            } catch (e) {
                console.error(e.message);
                process.exit(1);
            }
        });

    // Show template details
    templatesCmd
        .command('show <name>')
        .description('Show detailed information about a template')
        .action(async (name) => {
            try {
                const template = getTemplateInfo(name);

                if (!template) {
                    const suggestions = suggestTemplates(name);
                    info(`Template '${name}' not found.`);
                    if (suggestions.length > 0) {
                        info('Did you mean: ' + suggestions.join(', '));
                    }
                    return;
                }

                header(`📦 ${template.name}`);

                console.log(`
  Provider:    ${template.provider}
  Type:        ${template.type}
  Description: ${template.description}
  Default Expiry: ${template.defaultExpiry}
  Tags:        ${template.tags}
  
💡 Usage:
  skv add my-${name}-key --template ${name}
  skv add my-key --template ${name} --generate
        `);

            } catch (e) {
                console.error(e.message);
                process.exit(1);
            }
        });

    // Search templates
    templatesCmd
        .command('search <query>')
        .description('Search for templates')
        .action(async (query) => {
            try {
                const results = suggestTemplates(query);

                if (results.length === 0) {
                    info(`No templates found matching '${query}'`);
                    return;
                }

                header(`🔍 Search results for "${query}"`);

                const table = createTable(['Template', 'Type', 'Description']);
                for (const name of results) {
                    const t = getTemplateInfo(name);
                    table.push([name, t.type, t.description]);
                }
                printTable(table);

            } catch (e) {
                console.error(e.message);
                process.exit(1);
            }
        });
}

// Helper function to get emoji for category
function getCategoryEmoji(category) {
    const emojis = {
        cloud: '☁️',
        ai: '🤖',
        git: '📚',
        payment: '💳',
        database: '🗄️',
        email: '📧',
        notification: '🔔',
        monitoring: '📊',
        search: '🔍',
        auth: '🔐'
    };
    return emojis[category] || '📦';
}
