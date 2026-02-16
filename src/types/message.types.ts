/**
 * Message Type Definitions
 */

import type { Platform, Intent, SessionState } from '../config/constants.js';

/**
 * Normalized message from any platform
 */
export interface NormalizedMessage {
    // Identity
    messageId: string;
    platform: Platform;

    // Sender info
    chatId: string;
    userId: string;
    userName?: string;

    // Content
    text: string;
    command?: string;
    commandArgs?: string[];

    // Callback (for Telegram inline buttons)
    callbackData?: string;
    callbackQueryId?: string;

    // Metadata
    timestamp: Date;
    replyToMessageId?: string;

    // Original payload for platform-specific handling
    rawPayload: unknown;
}

/**
 * User session context
 */
export interface Session {
    sessionId: string;
    platform: Platform;
    chatId: string;
    userId: string;

    // Session state
    state: SessionState;
    currentIntent: Intent | null;

    // User preferences
    country: string;
    responseMode: 'MINI' | 'DETAILED';
    privacyAccepted?: boolean;
    privacyAcceptedAt?: Date;

    // Context for follow-up queries
    context: SessionContext;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
}

export interface SessionContext {
    lastDrugMentioned?: string;
    lastConditionMentioned?: string;
    pendingDrugs?: string[];
    patientParams?: PatientParams;
    conversationHistory: ConversationTurn[];
}

export interface ConversationTurn {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface PatientParams {
    age?: number;
    weight?: number;          // kg
    renalFunction?: number;   // CrCl ml/min or eGFR
    hepaticFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
}

/**
 * Intent classification result
 */
export interface IntentResult {
    intent: Intent;
    confidence: number;
    extractedEntities: ExtractedEntities;
}

export interface ExtractedEntities {
    drugs?: string[];
    conditions?: string[];
    patientParams?: PatientParams;
    country?: string;
}
