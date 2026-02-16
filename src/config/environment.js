"use strict";
/**
 * Environment Configuration
 *
 * Loads and validates environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
function getEnvVar(key, required) {
    if (required === void 0) { required = true; }
    var value = process.env[key];
    if (required && !value) {
        throw new Error("Missing required environment variable: ".concat(key));
    }
    return value !== null && value !== void 0 ? value : '';
}
function getEnvVarAsNumber(key, defaultValue) {
    var value = process.env[key];
    if (!value)
        return defaultValue;
    var parsed = parseInt(value, 10);
    if (isNaN(parsed))
        return defaultValue;
    return parsed;
}
function loadConfig() {
    var _a, _b, _c, _d, _e, _f;
    return {
        nodeEnv: (_a = process.env['NODE_ENV']) !== null && _a !== void 0 ? _a : 'development',
        // Telegram (optional - only needed by telegram function)
        telegramBotToken: getEnvVar('TELEGRAM_BOT_TOKEN', false),
        telegramWebhookSecret: getEnvVar('TELEGRAM_WEBHOOK_SECRET', false),
        // WhatsApp (required for WhatsApp support)
        whatsappAccessToken: getEnvVar('WHATSAPP_ACCESS_TOKEN', false),
        whatsappPhoneNumberId: getEnvVar('WHATSAPP_PHONE_NUMBER_ID', false),
        whatsappVerifyToken: getEnvVar('WHATSAPP_VERIFY_TOKEN', false),
        // Google Cloud - GCLOUD_PROJECT is auto-injected by Firebase Functions
        googleCloudProject: (_c = (_b = process.env['GCLOUD_PROJECT']) !== null && _b !== void 0 ? _b : process.env['GCP_PROJECT']) !== null && _c !== void 0 ? _c : 'medinfo-bot',
        geminiApiKey: getEnvVar('GEMINI_API_KEY', true),
        // Application settings with defaults
        sessionTtlMinutes: getEnvVarAsNumber('SESSION_TTL_MINUTES', 30),
        cacheTtlHours: getEnvVarAsNumber('CACHE_TTL_HOURS', 24),
        rateLimitPerMinute: getEnvVarAsNumber('RATE_LIMIT_PER_MINUTE', 30),
        logLevel: (_d = process.env['LOG_LEVEL']) !== null && _d !== void 0 ? _d : 'info',
        // Country settings
        supportedCountries: ((_e = process.env['SUPPORTED_COUNTRIES']) !== null && _e !== void 0 ? _e : 'USA,UK,Nigeria,Ghana,India,South_Africa,WHO').split(','),
        defaultCountry: (_f = process.env['DEFAULT_COUNTRY']) !== null && _f !== void 0 ? _f : 'WHO',
    };
}
// Singleton config instance
var configInstance = null;
function getConfig() {
    if (!configInstance) {
        configInstance = loadConfig();
    }
    return configInstance;
}
