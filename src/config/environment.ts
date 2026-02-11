/**
 * Environment Configuration
 * 
 * Loads and validates environment variables
 */

export interface Config {
    // Node environment
    nodeEnv: 'development' | 'production' | 'test';

    // Telegram
    telegramBotToken: string;
    telegramWebhookSecret: string;

    // WhatsApp
    whatsappAccessToken: string;
    whatsappPhoneNumberId: string;
    whatsappVerifyToken: string;

    // Google Cloud
    googleCloudProject: string;
    geminiApiKey: string;

    // Application settings
    sessionTtlMinutes: number;
    cacheTtlHours: number;
    rateLimitPerMinute: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';

    // Country settings
    supportedCountries: string[];
    defaultCountry: string;
}

function getEnvVar(key: string, required: boolean = true): string {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value ?? '';
}

function getEnvVarAsNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return defaultValue;
    return parsed;
}

export function loadConfig(): Config {
    return {
        nodeEnv: (process.env['NODE_ENV'] as Config['nodeEnv']) ?? 'development',

        // Telegram (optional - only needed by telegram function)
        telegramBotToken: getEnvVar('TELEGRAM_BOT_TOKEN', false),
        telegramWebhookSecret: getEnvVar('TELEGRAM_WEBHOOK_SECRET', false),

        // WhatsApp (required for WhatsApp support)
        whatsappAccessToken: getEnvVar('WHATSAPP_ACCESS_TOKEN', false),
        whatsappPhoneNumberId: getEnvVar('WHATSAPP_PHONE_NUMBER_ID', false),
        whatsappVerifyToken: getEnvVar('WHATSAPP_VERIFY_TOKEN', false),

        // Google Cloud - GCLOUD_PROJECT is auto-injected by Firebase Functions
        googleCloudProject: process.env['GCLOUD_PROJECT'] ?? process.env['GCP_PROJECT'] ?? 'medinfo-bot',
        geminiApiKey: getEnvVar('GEMINI_API_KEY', true),

        // Application settings with defaults
        sessionTtlMinutes: getEnvVarAsNumber('SESSION_TTL_MINUTES', 30),
        cacheTtlHours: getEnvVarAsNumber('CACHE_TTL_HOURS', 24),
        rateLimitPerMinute: getEnvVarAsNumber('RATE_LIMIT_PER_MINUTE', 30),
        logLevel: (process.env['LOG_LEVEL'] as Config['logLevel']) ?? 'info',

        // Country settings
        supportedCountries: (process.env['SUPPORTED_COUNTRIES'] ?? 'USA,UK,Nigeria,Ghana,India,South_Africa,WHO').split(','),
        defaultCountry: process.env['DEFAULT_COUNTRY'] ?? 'WHO',
    };
}

// Singleton config instance
let configInstance: Config | null = null;

export function getConfig(): Config {
    if (!configInstance) {
        configInstance = loadConfig();
    }
    return configInstance;
}
