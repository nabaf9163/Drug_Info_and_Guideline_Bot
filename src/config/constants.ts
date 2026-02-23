/**
 * Application Constants
 */

// Bot Information
export const BOT_NAME = 'MedInfo';
export const BOT_VERSION = '1.0.0';

// Admin users (Telegram IDs)
export const ADMIN_CHAT_IDS = ['1390885478']; // nabaf

// Session settings
export const DEFAULT_SESSION_TTL_MINUTES = 30;

// Cache settings
export const DEFAULT_CACHE_TTL_HOURS = 24;
export const GUIDELINE_CACHE_TTL_HOURS = 168; // 7 days

// Rate limiting
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 30;

// LLM settings - Dual model strategy for speed vs depth
export const DEFAULT_MODEL = 'gemini-2.5-pro';       // DETAILED mode — full monograph depth
export const MINI_MODEL = 'gemini-2.5-flash';         // MINI mode — fast ward-round responses
export const INTENT_MODEL = 'gemini-2.5-flash';       // Intent classification — trivial task
export const DEFAULT_TEMPERATURE = 0.3;
export const MINI_MAX_TOKENS = 2048;                   // MINI: 250 words needs margin for structure
export const DETAILED_MAX_TOKENS = 4096;               // DETAILED: full guidelines need room

// Supported countries for guidelines
export const SUPPORTED_COUNTRIES = [
    { code: 'USA', name: 'United States', emoji: '🇺🇸' },
    { code: 'UK', name: 'United Kingdom', emoji: '🇬🇧' },
    { code: 'Nigeria', name: 'Nigeria', emoji: '🇳🇬' },
    { code: 'Ghana', name: 'Ghana', emoji: '🇬🇭' },
    { code: 'India', name: 'India', emoji: '🇮🇳' },
    { code: 'South_Africa', name: 'South Africa', emoji: '🇿🇦' },
    { code: 'WHO', name: 'WHO/Global', emoji: '🌐' },
] as const;

// Platform message limits
export const TELEGRAM_MESSAGE_LIMIT = 4096;
export const WHATSAPP_MESSAGE_LIMIT = 1024;

// Intent types
export const INTENTS = {
    DRUG_INFO: 'DRUG_INFO',
    DRUG_INTERACTION: 'DRUG_INTERACTION',
    DOSAGE_QUERY: 'DOSAGE_QUERY',
    GUIDELINE_QUERY: 'GUIDELINE_QUERY',
    COUNTRY_SELECT: 'COUNTRY_SELECT',
    HELP: 'HELP',
    START: 'START',
    CANCEL: 'CANCEL',
    PATIENT_COUNSELING: 'PATIENT_COUNSELING',
    UNKNOWN: 'UNKNOWN',
} as const;

export type Intent = typeof INTENTS[keyof typeof INTENTS];

// Session states
export const SESSION_STATES = {
    IDLE: 'IDLE',
    AWAITING_PRIVACY: 'AWAITING_PRIVACY',
    AWAITING_COUNTRY: 'AWAITING_COUNTRY',
    AWAITING_DRUG_NAME: 'AWAITING_DRUG_NAME',
    AWAITING_SECOND_DRUG: 'AWAITING_SECOND_DRUG',
    AWAITING_PATIENT_INFO: 'AWAITING_PATIENT_INFO',
    PROCESSING: 'PROCESSING',
} as const;

export type SessionState = typeof SESSION_STATES[keyof typeof SESSION_STATES];

// Platforms
export const PLATFORMS = {
    TELEGRAM: 'telegram',
    WHATSAPP: 'whatsapp',
} as const;

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];

// Firestore Collections
export const COLLECTIONS = {
    QUERY_LOGS: 'queryLogs',
    VALIDATION_LOGS: 'validationLogs',
    FEEDBACK_LOGS: 'feedbackLogs',
    ANALYTICS: 'analytics'
} as const;
