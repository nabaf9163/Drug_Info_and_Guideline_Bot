"use strict";
/**
 * Application Constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORMS = exports.SESSION_STATES = exports.INTENTS = exports.WHATSAPP_MESSAGE_LIMIT = exports.TELEGRAM_MESSAGE_LIMIT = exports.SUPPORTED_COUNTRIES = exports.DEFAULT_MAX_TOKENS = exports.DEFAULT_TEMPERATURE = exports.DEFAULT_MODEL = exports.DEFAULT_RATE_LIMIT_PER_MINUTE = exports.GUIDELINE_CACHE_TTL_HOURS = exports.DEFAULT_CACHE_TTL_HOURS = exports.DEFAULT_SESSION_TTL_MINUTES = exports.BOT_VERSION = exports.BOT_NAME = void 0;
// Bot Information
exports.BOT_NAME = 'MedInfo';
exports.BOT_VERSION = '1.0.0';
// Session settings
exports.DEFAULT_SESSION_TTL_MINUTES = 30;
// Cache settings
exports.DEFAULT_CACHE_TTL_HOURS = 24;
exports.GUIDELINE_CACHE_TTL_HOURS = 168; // 7 days
// Rate limiting
exports.DEFAULT_RATE_LIMIT_PER_MINUTE = 30;
// LLM settings - Using Gemini 2.5 Pro for advanced reasoning
exports.DEFAULT_MODEL = 'gemini-2.5-pro';
exports.DEFAULT_TEMPERATURE = 0.3;
exports.DEFAULT_MAX_TOKENS = 4096; // Increased significantly for full guidelines
// Supported countries for guidelines
exports.SUPPORTED_COUNTRIES = [
    { code: 'USA', name: 'United States', emoji: '🇺🇸' },
    { code: 'UK', name: 'United Kingdom', emoji: '🇬🇧' },
    { code: 'Nigeria', name: 'Nigeria', emoji: '🇳🇬' },
    { code: 'Ghana', name: 'Ghana', emoji: '🇬🇭' },
    { code: 'India', name: 'India', emoji: '🇮🇳' },
    { code: 'South_Africa', name: 'South Africa', emoji: '🇿🇦' },
    { code: 'WHO', name: 'WHO/Global', emoji: '🌐' },
];
// Platform message limits
exports.TELEGRAM_MESSAGE_LIMIT = 4096;
exports.WHATSAPP_MESSAGE_LIMIT = 1024;
// Intent types
exports.INTENTS = {
    DRUG_INFO: 'DRUG_INFO',
    DRUG_INTERACTION: 'DRUG_INTERACTION',
    DOSAGE_QUERY: 'DOSAGE_QUERY',
    GUIDELINE_QUERY: 'GUIDELINE_QUERY',
    COUNTRY_SELECT: 'COUNTRY_SELECT',
    HELP: 'HELP',
    START: 'START',
    CANCEL: 'CANCEL',
    UNKNOWN: 'UNKNOWN',
};
// Session states
exports.SESSION_STATES = {
    IDLE: 'IDLE',
    AWAITING_PRIVACY: 'AWAITING_PRIVACY',
    AWAITING_COUNTRY: 'AWAITING_COUNTRY',
    AWAITING_DRUG_NAME: 'AWAITING_DRUG_NAME',
    AWAITING_SECOND_DRUG: 'AWAITING_SECOND_DRUG',
    AWAITING_PATIENT_INFO: 'AWAITING_PATIENT_INFO',
    PROCESSING: 'PROCESSING',
};
// Platforms
exports.PLATFORMS = {
    TELEGRAM: 'telegram',
    WHATSAPP: 'whatsapp',
};
