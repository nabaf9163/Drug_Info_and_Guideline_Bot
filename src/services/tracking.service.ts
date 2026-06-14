import { getFirestore } from 'firebase-admin/firestore';
import type { BotResponse } from '../types/response.types.js';
import type { NormalizedMessage } from '../types/message.types.js';
import { COLLECTIONS } from '../config/constants.js';

// Types for logging
interface QueryLogEntry {
    sessionId: string;
    platform: string;
    // Regional & Identity
    country: string;
    languageCode?: string;
    userId: string;
    username?: string;
    firstName?: string;
    // Query details
    intent: string;
    mode: 'MINI' | 'DETAILED';
    modelUsed: string;
    queryLength: number;
    responseLength: number;
    latencyMs: number;
    tokensUsed: number;
    isExpand: boolean;
    drugsDetected?: string[];
    // Metadata
    timestamp: Date;
    date: string; // YYYY-MM-DD for simpler aggregation
}

interface ValidationLogEntry {
    sessionId: string;
    inputPromptLength: number;
    validationPassed: boolean;
    missingElements: string[];
    warnings: string[];
    didRegenerate: boolean;
    didAppendFooter: boolean;
    didAppendSeverity: boolean;
    durationMs: number;
    timestamp: Date;
}

interface FeedbackLogEntry {
    sessionId: string;
    userId: string;
    intent: string;
    mode: 'MINI' | 'DETAILED';
    country: string;
    rating: 'positive' | 'negative';
    feedbackReason?: string; // e.g., 'incomplete', 'inaccurate'
    timestamp: Date;
}

/**
 * Service for tracking user activity and metrics
 * All methods are "fire-and-forget" to avoid blocking response latency
 */
export const trackingService = {
    /**
     * Log a completed query interaction
     */
    async logQuery(data: {
        message: NormalizedMessage;
        sessionId: string;
        country: string;
        intent: string;
        mode: 'MINI' | 'DETAILED';
        response: BotResponse;
        modelUsed?: string;
        drugsDetected?: string[];
    }): Promise<void> {
        safeLog(async () => {
            const db = getFirestore();
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            const entry: QueryLogEntry = {
                sessionId: data.sessionId,
                platform: data.message.platform,
                country: data.country,
                languageCode: data.message.languageCode,
                userId: data.message.userId,
                username: data.message.username,
                firstName: data.message.firstName,
                intent: data.intent,
                mode: data.mode,
                modelUsed: data.response.modelUsed || data.modelUsed || 'unknown',
                queryLength: data.message.text.length,
                responseLength: data.response.text.length,
                latencyMs: data.response.processingTimeMs,
                tokensUsed: data.response.tokensUsed,
                isExpand: data.message.callbackData?.includes('cmd:expand') ?? false,
                drugsDetected: data.drugsDetected,
                timestamp: now,
                date: today,
            };

            await db.collection(COLLECTIONS.QUERY_LOGS).add(entry);
        });
    },

    /**
     * Log validation results (monitoring safety & prompt effectiveness)
     */
    async logValidation(data: {
        sessionId: string;
        validationResult: any; // Typed as any to decouple from llm.service types
        durationMs: number;
    }): Promise<void> {
        safeLog(async () => {
            const db = getFirestore();
            const entry: ValidationLogEntry = {
                sessionId: data.sessionId,
                inputPromptLength: 0, // Placeholder
                validationPassed: data.validationResult.isValid,
                missingElements: data.validationResult.missingElements || [],
                warnings: data.validationResult.warnings || [],
                didRegenerate: data.validationResult.regenerated || false,
                didAppendFooter: data.validationResult.appendedFooter || false,
                didAppendSeverity: data.validationResult.appendedSeverity || false,
                durationMs: data.durationMs,
                timestamp: new Date(),
            };

            await db.collection(COLLECTIONS.VALIDATION_LOGS).add(entry);
        });
    },

    /**
     * Log user feedback (👍 / 👎)
     */
    async logFeedback(data: {
        sessionId: string;
        userId: string;
        intent: string;
        mode: 'MINI' | 'DETAILED';
        country: string;
        rating: 'positive' | 'negative';
        reason?: string;
    }): Promise<void> {
        safeLog(async () => {
            const db = getFirestore();
            const entry: FeedbackLogEntry = {
                sessionId: data.sessionId,
                userId: data.userId,
                intent: data.intent,
                mode: data.mode,
                country: data.country,
                rating: data.rating,
                feedbackReason: data.reason,
                timestamp: new Date(),
            };

            await db.collection(COLLECTIONS.FEEDBACK_LOGS).add(entry);
        });
    }
};

/**
 * Helper to execute async logging without ignoring errors, but preventing crashes
 */
async function safeLog(fn: () => Promise<void>) {
    try {
        await fn();
    } catch (error) {
        console.error('[trackingService] Failed to log:', error);
        // Do not rethrow - metrics should not break the bot
    }
}
