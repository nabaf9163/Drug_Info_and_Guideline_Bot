/**
 * Response Type Definitions
 */

/**
 * Bot response object
 */
export interface BotResponse {
    // Content
    text: string;
    type?: 'text' | 'privacy_consent' | 'welcome' | 'help' | 'country_select' | 'country_confirmed';

    // Platform-specific formatted text
    formattedText: {
        telegram: string;
        whatsapp: string;
    };

    // Interactive elements
    inlineButtons?: InlineButton[][];  // Telegram inline keyboard
    quickReplies?: string[];           // WhatsApp quick replies

    // Metadata
    sources?: string[];
    disclaimer?: string;
    fromCache: boolean;

    // Metrics
    processingTimeMs: number;
    tokensUsed: number;
}

export interface InlineButton {
    text: string;
    callbackData: string;
}

/**
 * LLM context for generating responses
 */
export interface LLMContext {
    sessionId: string;
    userCountry: string;
    userMode: 'MINI' | 'DETAILED';
    intent: string;
    userMessage: string;
    extractedEntities: {
        drugs?: string[];
        conditions?: string[];
        patientParams?: {
            age?: number;
            weight?: number;
            renalFunction?: number;
        };
    };
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

/**
 * LLM response from Gemini
 */
export interface LLMResponse {
    text: string;
    tokensUsed: {
        prompt: number;
        completion: number;
        total: number;
    };
    finishReason: 'stop' | 'length' | 'safety' | 'other';
    modelUsed: string;
    latencyMs: number;
}

/**
 * Cached response entry
 */
export interface CachedResponse {
    cacheKey: string;
    intent: string;
    country: string;
    normalizedQuery: string;
    response: string;
    metadata: {
        sources: string[];
        drugsMentioned: string[];
        generatedAt: Date;
        modelVersion: string;
    };
    hitCount: number;
    lastHitAt: Date;
    createdAt: Date;
    expiresAt: Date;
}
