/**
 * Integration Catalog - Maps services to Flowise nodes and credentials
 * Used by PrimitiveMapper to convert LLM primitives to actual nodes
 */

export interface IntegrationDefinition {
    nodes: string[]
    credentials: string[]
    isPersonal: boolean
    category: 'social' | 'content' | 'messaging' | 'crm' | 'ecommerce' | 'finance' | 'search' | 'ai' | 'storage' | 'generic'
    description?: string
}

export const INTEGRATION_CATALOG: Record<string, IntegrationDefinition> = {
    // ===== SOCIAL MEDIA =====
    'Twitter': {
        nodes: ['twitterSearch', 'requestsPost'],
        credentials: ['twitterOAuth2'],
        isPersonal: true,
        category: 'social',
        description: 'Twitter/X search and posting'
    },
    'Instagram': {
        nodes: ['requestsPost'],
        credentials: ['metaBusinessOAuth2', 'instagramApi'],
        isPersonal: true,
        category: 'social',
        description: 'Instagram posting via Meta Business API'
    },
    'LinkedIn': {
        nodes: ['requestsPost'],
        credentials: ['linkedinOAuth2'],
        isPersonal: true,
        category: 'social',
        description: 'LinkedIn profile and company page posting'
    },
    'TikTok': {
        nodes: ['requestsPost'],
        credentials: ['tiktokOAuth2'],
        isPersonal: true,
        category: 'social',
        description: 'TikTok content publishing'
    },
    'Facebook': {
        nodes: ['requestsPost'],
        credentials: ['metaBusinessOAuth2'],
        isPersonal: true,
        category: 'social',
        description: 'Facebook page posting'
    },

    // ===== CONTENT & PRODUCTIVITY =====
    'Blog': {
        nodes: ['requestsPost'],
        credentials: ['wordpressApi', 'ghostApi', 'mediumOAuth2'],
        isPersonal: true,
        category: 'content',
        description: 'WordPress, Ghost, Medium publishing'
    },
    'Notion': {
        nodes: ['notionPage', 'notionDatabase', 'requestsPost'],
        credentials: ['notionApi'],
        isPersonal: true,
        category: 'content',
        description: 'Notion pages and databases'
    },
    'Airtable': {
        nodes: ['requestsPost'],
        credentials: ['airtableApi'],
        isPersonal: true,
        category: 'content',
        description: 'Airtable base management'
    },
    'Google Sheets': {
        nodes: ['googleSheets', 'requestsPost'],
        credentials: ['googleSheetsOAuth2'],
        isPersonal: true,
        category: 'content',
        description: 'Google Sheets read/write'
    },
    'Google Docs': {
        nodes: ['googleDocs'],
        credentials: ['googleDocsOAuth2'],
        isPersonal: true,
        category: 'content',
        description: 'Google Docs creation and editing'
    },
    'Google Drive': {
        nodes: ['googleDrive'],
        credentials: ['googleDriveOAuth2'],
        isPersonal: true,
        category: 'content',
        description: 'Google Drive file management'
    },
    'Google Calendar': {
        nodes: ['googleCalendar'],
        credentials: ['googleCalendarOAuth2'],
        isPersonal: true,
        category: 'content',
        description: 'Google Calendar events'
    },

    // ===== MESSAGING =====
    'Email': {
        nodes: ['resend', 'gmail', 'microsoftOutlook'],
        credentials: ['resendApi', 'gmailOAuth2', 'microsoftOutlookOAuth2'],
        isPersonal: true,  // Can be platform (resend) or personal (gmail/outlook)
        category: 'messaging',
        description: 'Email sending via multiple providers'
    },
    'Slack': {
        nodes: ['slackMCP', 'requestsPost'],
        credentials: ['slackApi'],
        isPersonal: true,
        category: 'messaging',
        description: 'Slack messaging and bot actions'
    },
    'Discord': {
        nodes: ['requestsPost'],
        credentials: ['discordWebhook'],
        isPersonal: true,
        category: 'messaging',
        description: 'Discord webhooks and bot API'
    },
    'Telegram': {
        nodes: ['requestsPost'],
        credentials: ['telegramBot'],
        isPersonal: true,
        category: 'messaging',
        description: 'Telegram bot messaging'
    },
    'WhatsApp': {
        nodes: ['requestsPost'],
        credentials: ['twilioApi', 'whatsappBusinessApi'],
        isPersonal: true,
        category: 'messaging',
        description: 'WhatsApp messaging via Twilio or Business API'
    },
    'Microsoft Teams': {
        nodes: ['microsoftTeams'],
        credentials: ['microsoftTeamsOAuth2'],
        isPersonal: true,
        category: 'messaging',
        description: 'Microsoft Teams messaging'
    },

    // ===== CRM & SALES =====
    'HubSpot': {
        nodes: ['requestsPost'],
        credentials: ['hubspotApi'],
        isPersonal: true,
        category: 'crm',
        description: 'HubSpot CRM operations'
    },
    'Salesforce': {
        nodes: ['requestsPost'],
        credentials: ['salesforceOAuth2'],
        isPersonal: true,
        category: 'crm',
        description: 'Salesforce CRM'
    },
    'Pipedrive': {
        nodes: ['requestsPost'],
        credentials: ['pipedriveApi'],
        isPersonal: true,
        category: 'crm',
        description: 'Pipedrive CRM'
    },
    'Typeform': {
        nodes: ['requestsPost'],
        credentials: ['typeformApi'],
        isPersonal: true,
        category: 'crm',
        description: 'Typeform responses and webhooks'
    },
    'Jira': {
        nodes: ['jira'],
        credentials: ['jiraApi'],
        isPersonal: true,
        category: 'crm',
        description: 'Jira issue tracking'
    },

    // ===== E-COMMERCE =====
    'Shopify': {
        nodes: ['requestsPost'],
        credentials: ['shopifyApi'],
        isPersonal: true,
        category: 'ecommerce',
        description: 'Shopify store webhooks and API'
    },
    'Stripe': {
        nodes: ['stripeTool', 'requestsPost'],
        credentials: ['stripeApi'],
        isPersonal: true,
        category: 'ecommerce',
        description: 'Stripe payments and subscriptions'
    },
    'PayPal': {
        nodes: ['requestsPost'],
        credentials: ['paypalApi'],
        isPersonal: true,
        category: 'ecommerce',
        description: 'PayPal transactions'
    },

    // ===== SEARCH & DATA =====
    'Web Search': {
        nodes: ['serper', 'braveSearchAPI', 'serpAPI', 'googleSearchAPI', 'tavilyAPI'],
        credentials: ['serperApi', 'braveSearchApi', 'serpApi', 'googleSearchApi', 'tavilyApi'],
        isPersonal: false,  // Platform-managed
        category: 'search',
        description: 'Web search via multiple providers'
    },
    'YouTube': {
        nodes: ['youtubeSearch', 'requestsPost'],
        credentials: ['youtubeOAuth2'],
        isPersonal: true,
        category: 'content',
        description: 'YouTube video search and data'
    },
    'Reddit': {
        nodes: ['requestsPost'],
        credentials: ['redditOAuth2'],
        isPersonal: true,
        category: 'social',
        description: 'Reddit posts and comments'
    },
    'RSS': {
        nodes: ['requestsPost'],
        credentials: [],
        isPersonal: false,
        category: 'content',
        description: 'RSS feed monitoring'
    },

    // ===== AI & ML =====
    'OpenAI': {
        nodes: ['chatOpenAI', 'dalle'],
        credentials: ['openAIApi'],
        isPersonal: false,  // Can be platform-managed
        category: 'ai',
        description: 'OpenAI GPT and DALL-E models'
    },
    'Anthropic': {
        nodes: ['chatAnthropic'],
        credentials: ['anthropicApi'],
        isPersonal: false,
        category: 'ai',
        description: 'Anthropic Claude models'
    },
    'Whisper': {
        nodes: ['assemblyAI', 'chatOpenAI'],
        credentials: ['assemblyAIApi', 'openAIApi'],
        isPersonal: false,
        category: 'ai',
        description: 'Speech-to-text transcription'
    },

    // ===== STORAGE & DATABASES =====
    'PostgreSQL': {
        nodes: ['postgres'],
        credentials: ['postgresApi'],
        isPersonal: true,
        category: 'storage',
        description: 'PostgreSQL database'
    },
    'MongoDB': {
        nodes: ['mongodb'],
        credentials: ['mongoDBApi'],
        isPersonal: true,
        category: 'storage',
        description: 'MongoDB database'
    },
    'Redis': {
        nodes: ['redis'],
        credentials: ['redisApi'],
        isPersonal: true,
        category: 'storage',
        description: 'Redis cache and storage'
    },
    'AWS S3': {
        nodes: ['requestsPost'],
        credentials: ['awsApi'],
        isPersonal: true,
        category: 'storage',
        description: 'AWS S3 file storage'
    },

    // ===== GENERIC & UTILITIES =====
    'Webhook': {
        nodes: ['requestsPost'],
        credentials: [],
        isPersonal: false,
        category: 'generic',
        description: 'Generic HTTP webhook calls'
    },
    'Custom API': {
        nodes: ['requestsPost', 'requestsGet', 'customCode'],
        credentials: [],
        isPersonal: false,
        category: 'generic',
        description: 'Custom API integrations'
    },
    'Web Scraper': {
        nodes: ['webScraperTool', 'cheerio', 'playwright', 'puppeteer', 'firecrawl'],
        credentials: ['firecrawlApi'],
        isPersonal: false,  // Platform-managed
        category: 'search',
        description: 'Web scraping tools'
    }
}

/**
 * Get integration by service name
 */
export function getIntegration(serviceName: string): IntegrationDefinition | undefined {
    return INTEGRATION_CATALOG[serviceName]
}

/**
 * Get all integrations by category
 */
export function getIntegrationsByCategory(category: string): Record<string, IntegrationDefinition> {
    const result: Record<string, IntegrationDefinition> = {}
    for (const [name, def] of Object.entries(INTEGRATION_CATALOG)) {
        if (def.category === category) {
            result[name] = def
        }
    }
    return result
}

/**
 * Check if service is platform-managed (uses workspace credentials)
 */
export function isPlatformManaged(serviceName: string): boolean {
    const integration = INTEGRATION_CATALOG[serviceName]
    return integration ? !integration.isPersonal : false
}

/**
 * Get primary node for a service
 */
export function getPrimaryNode(serviceName: string): string | undefined {
    const integration = INTEGRATION_CATALOG[serviceName]
    return integration?.nodes[0]
}

/**
 * Get primary credential for a service
 */
export function getPrimaryCredential(serviceName: string): string | undefined {
    const integration = INTEGRATION_CATALOG[serviceName]
    return integration?.credentials[0]
}

