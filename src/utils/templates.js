/**
 * SkyVault Templates
 * Pre-built templates for common services to help beginners
 */

// Category mapping: maps template category to display name and sort order
const categoryMeta = {
    cloud: { name: 'Cloud & Infrastructure', order: 1 },
    ai: { name: 'AI & ML Services', order: 2 },
    git: { name: 'Version Control', order: 3 },
    payment: { name: 'Payment & Billing', order: 4 },
    database: { name: 'Database Services', order: 5 },
    hosting: { name: 'Hosting & Deployment', order: 6 },
    email: { name: 'Email Services', order: 7 },
    notification: { name: 'Notifications & Chat', order: 8 },
    monitoring: { name: 'Monitoring & Analytics', order: 9 },
    search: { name: 'Search Services', order: 10 },
    auth: { name: 'Authentication', order: 11 },
    generic: { name: 'Generic', order: 12 }
};

// Available templates for secret creation
export const templates = {
    // Cloud Providers
    aws: {
        name: 'AWS Access Key',
        provider: 'aws',
        type: 'access_key',
        category: 'cloud',
        tags: ['aws', 'cloud', 'infrastructure'],
        description: 'AWS Access Key ID and Secret Access Key',
        expiresDefault: '90d',
        fields: ['access_key_id', 'secret_access_key']
    },

    // AI/ML Services
    openai: {
        name: 'OpenAI API Key',
        provider: 'openai',
        type: 'api_key',
        category: 'ai',
        tags: ['ai', 'openai', 'gpt'],
        description: 'OpenAI API Key for GPT models',
        expiresDefault: '90d'
    },

    anthropic: {
        name: 'Anthropic API Key',
        provider: 'anthropic',
        type: 'api_key',
        category: 'ai',
        tags: ['ai', 'anthropic', 'claude'],
        description: 'Anthropic API Key for Claude models',
        expiresDefault: '90d'
    },

    google_ai: {
        name: 'Google AI API Key',
        provider: 'google',
        type: 'api_key',
        category: 'ai',
        tags: ['ai', 'google', 'gemini'],
        description: 'Google AI Studio API Key',
        expiresDefault: '90d'
    },

    // Version Control
    github: {
        name: 'GitHub Personal Access Token',
        provider: 'github',
        type: 'api_token',
        category: 'git',
        tags: ['github', 'git', 'version-control'],
        description: 'GitHub Personal Access Token (PAT)',
        expiresDefault: '90d',
        scopes: ['repo', 'workflow', 'read:user']
    },

    gitlab: {
        name: 'GitLab Access Token',
        provider: 'gitlab',
        type: 'api_token',
        category: 'git',
        tags: ['gitlab', 'git', 'version-control'],
        description: 'GitLab Personal Access Token',
        expiresDefault: '90d'
    },

    bitbucket: {
        name: 'Bitbucket App Password',
        provider: 'bitbucket',
        type: 'app_password',
        category: 'git',
        tags: ['bitbucket', 'git', 'version-control'],
        description: 'Bitbucket App Password',
        expiresDefault: '90d'
    },

    // Payment Processors
    stripe: {
        name: 'Stripe API Key',
        provider: 'stripe',
        type: 'api_key',
        category: 'payment',
        tags: ['payment', 'stripe', 'billing'],
        description: 'Stripe Secret API Key',
        expiresDefault: '1y',
        testMode: true
    },

    paypal: {
        name: 'PayPal API Credentials',
        provider: 'paypal',
        type: 'api_key',
        category: 'payment',
        tags: ['payment', 'paypal', 'billing'],
        description: 'PayPal Client ID and Secret',
        expiresDefault: '1y'
    },

    // Database Services
    supabase: {
        name: 'Supabase API Key',
        provider: 'supabase',
        type: 'api_key',
        category: 'database',
        tags: ['database', 'supabase', 'backend'],
        description: 'SupabaseAnon Key and Service Role Key',
        expiresDefault: '1y'
    },

    firebase: {
        name: 'Firebase Credentials',
        provider: 'firebase',
        type: 'service_account',
        category: 'database',
        tags: ['database', 'firebase', 'google', 'backend'],
        description: 'Firebase Service Account JSON',
        expiresDefault: '1y'
    },

    planetScale: {
        name: 'PlanetScale Credentials',
        provider: 'planetscale',
        type: 'database_url',
        category: 'database',
        tags: ['database', 'planetscale', 'mysql'],
        description: 'PlanetScale Database URL',
        expiresDefault: '90d'
    },

    // Cloud Hosting
    vercel: {
        name: 'Vercel API Token',
        provider: 'vercel',
        type: 'api_token',
        category: 'hosting',
        tags: ['hosting', 'vercel', 'deployment', 'serverless'],
        description: 'Vercel API Token',
        expiresDefault: '90d'
    },

    netlify: {
        name: 'Netlify API Token',
        provider: 'netlify',
        type: 'api_token',
        category: 'hosting',
        tags: ['hosting', 'netlify', 'deployment'],
        description: 'Netlify Personal Access Token',
        expiresDefault: '90d'
    },

    railway: {
        name: 'Railway API Token',
        provider: 'railway',
        type: 'api_token',
        category: 'hosting',
        tags: ['hosting', 'railway', 'deployment'],
        description: 'Railway API Token',
        expiresDefault: '90d'
    },

    // Email Services
    sendgrid: {
        name: 'SendGrid API Key',
        provider: 'sendgrid',
        type: 'api_key',
        category: 'email',
        tags: ['email', 'sendgrid', 'notification'],
        description: 'SendGrid API Key',
        expiresDefault: '1y'
    },

    mailgun: {
        name: 'Mailgun API Key',
        provider: 'mailgun',
        type: 'api_key',
        category: 'email',
        tags: ['email', 'mailgun', 'notification'],
        description: 'Mailgun API Key',
        expiresDefault: '1y'
    },

    // Notification Services
    slack: {
        name: 'Slack Bot Token',
        provider: 'slack',
        type: 'bot_token',
        category: 'notification',
        tags: ['notification', 'slack', 'chat'],
        description: 'Slack Bot User OAuth Token',
        expiresDefault: '90d'
    },

    discord: {
        name: 'Discord Bot Token',
        provider: 'discord',
        type: 'bot_token',
        category: 'notification',
        tags: ['notification', 'discord', 'chat'],
        description: 'Discord Bot Token',
        expiresDefault: '90d'
    },

    twilio: {
        name: 'Twilio Credentials',
        provider: 'twilio',
        type: 'api_key',
        category: 'notification',
        tags: ['sms', 'twilio', 'notification'],
        description: 'Twilio Account SID and Auth Token',
        expiresDefault: '1y'
    },

    // Monitoring & Analytics
    datadog: {
        name: 'Datadog API Key',
        provider: 'datadog',
        type: 'api_key',
        category: 'monitoring',
        tags: ['monitoring', 'datadog', 'analytics'],
        description: 'Datadog API Key',
        expiresDefault: '1y'
    },

    sentry: {
        name: 'Sentry DSN',
        provider: 'sentry',
        type: 'dsn',
        category: 'monitoring',
        tags: ['monitoring', 'sentry', 'error-tracking'],
        description: 'Sentry DSN (Data Source Name)',
        expiresDefault: 'never'
    },

    // Search Services
    algolia: {
        name: 'Algolia API Keys',
        provider: 'algolia',
        type: 'api_key',
        category: 'search',
        tags: ['search', 'algolia', 'full-text'],
        description: 'Algolia Application ID and Admin API Key',
        expiresDefault: '1y'
    },

    elastic: {
        name: 'Elasticsearch Credentials',
        provider: 'elastic',
        type: 'api_key',
        category: 'search',
        tags: ['search', 'elastic', 'database'],
        description: 'Elasticsearch API Key',
        expiresDefault: '1y'
    },

    // Authentication
    auth0: {
        name: 'Auth0 Credentials',
        provider: 'auth0',
        type: 'client_secret',
        category: 'auth',
        tags: ['auth', 'auth0', 'authentication', 'oauth'],
        description: 'Auth0 Domain and Client Secret',
        expiresDefault: '1y'
    },

    // Generic API Key
    api_key: {
        name: 'Generic API Key',
        provider: 'generic',
        type: 'api_key',
        category: 'generic',
        tags: ['api', 'generic'],
        description: 'Generic API Key',
        expiresDefault: '90d'
    },

    // Generic Secret
    password: {
        name: 'Password',
        provider: 'generic',
        type: 'password',
        category: 'generic',
        tags: ['password', 'credential'],
        description: 'Generic Password',
        expiresDefault: '90d'
    }
};

/**
 * Get template by name
 * @param {string} name - Template name
 * @returns {Object|null} Template object or null if not found
 */
export function getTemplate(name) {
    return templates[name] || null;
}

/**
 * Get all available template names
 * @returns {string[]} Array of template names
 */
export function getTemplateNames() {
    return Object.keys(templates);
}

/**
 * Get templates by category
 * Derives categories automatically from template definitions
 * @param {string} category - Optional category to filter by
 * @returns {Object} Object with category names as keys and template arrays as values,
 *                   or array of template names if category is specified
 */
export function getTemplatesByCategory(category = null) {
    // Build category map from template definitions
    const categoryMap = {};

    for (const [templateName, template] of Object.entries(templates)) {
        const templateCategory = template.category || 'generic';

        if (!categoryMap[templateCategory]) {
            categoryMap[templateCategory] = [];
        }

        categoryMap[templateCategory].push(templateName);
    }

    // Sort templates within each category for consistent output
    for (const cat of Object.keys(categoryMap)) {
        categoryMap[cat].sort();
    }

    // If a specific category is requested, return only that category's templates
    if (category) {
        return categoryMap[category] || [];
    }

    // Return all categories sorted by display order
    const sortedCategories = Object.keys(categoryMeta).sort(
        (a, b) => (categoryMeta[a]?.order || 99) - (categoryMeta[b]?.order || 99)
    );

    const result = {};
    for (const cat of sortedCategories) {
        if (categoryMap[cat]) {
            result[cat] = categoryMap[cat];
        }
    }

    // Add any categories not in categoryMeta (dynamic categories)
    for (const cat of Object.keys(categoryMap)) {
        if (!result[cat]) {
            result[cat] = categoryMap[cat];
        }
    }

    return result;
}

/**
 * Get category metadata (display name and order)
 * @param {string} category - Category key
 * @returns {Object} Category metadata or null if not found
 */
export function getCategoryMeta(category) {
    return categoryMeta[category] || null;
}

/**
 * Get all available categories
 * @returns {Array} Array of category objects with key, name, and order
 */
export function getCategories() {
    return Object.entries(categoryMeta)
        .map(([key, meta]) => ({
            key,
            name: meta.name,
            order: meta.order
        }))
        .sort((a, b) => a.order - b.order);
}

/**
 * Suggest template based on name or provider
 * @param {string} query - Search query
 * @returns {string[]} Matching template names
 */
export function suggestTemplates(query) {
    const lowerQuery = query.toLowerCase();
    const suggestions = [];

    for (const [name, template] of Object.entries(templates)) {
        if (name.includes(lowerQuery) ||
            template.provider.includes(lowerQuery) ||
            template.name.toLowerCase().includes(lowerQuery) ||
            template.tags.some(tag => tag.includes(lowerQuery))) {
            suggestions.push(name);
        }
    }

    return suggestions;
}

/**
 * Get template metadata for display
 * @param {string} name - Template name
 * @returns {Object} Formatted template info
 */
export function getTemplateInfo(name) {
    const template = templates[name];
    if (!template) return null;

    return {
        name: template.name,
        provider: template.provider,
        type: template.type,
        description: template.description,
        defaultExpiry: template.expiresDefault,
        tags: template.tags.join(', ')
    };
}
