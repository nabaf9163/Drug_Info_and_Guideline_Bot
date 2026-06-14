/**
 * Session Service
 * 
 * Manages user sessions in Firestore
 */

import { Firestore, Timestamp } from '@google-cloud/firestore';
import type { Session, SessionContext, ConversationTurn } from '../types/message.types.js';
import type { Platform, SessionState, Intent } from '../config/constants.js';
import { SESSION_STATES } from '../config/constants.js';
import { getConfig } from '../config/environment.js';

// Initialize Firestore
let db: Firestore | null = null;

function getFirestore(): Firestore {
    if (!db) {
        const config = getConfig();
        db = new Firestore({
            projectId: config.googleCloudProject,
        });
    }
    return db;
}

const SESSIONS_COLLECTION = 'sessions';

/**
 * Generate a session ID from platform and chat ID
 */
function generateSessionId(platform: Platform, chatId: string): string {
    return `${platform}_${chatId}`;
}

/**
 * Get or create a session for a chat
 */
export async function getOrCreateSession(
    platform: Platform,
    chatId: string,
    userId: string
): Promise<Session> {
    const firestore = getFirestore();
    const sessionId = generateSessionId(platform, chatId);
    const docRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);

    const doc = await docRef.get();

    if (doc.exists) {
        const data = doc.data()!;
        const session: Session = {
            sessionId: data['sessionId'] as string,
            platform: data['platform'] as Platform,
            chatId: data['chatId'] as string,
            userId: data['userId'] as string,
            state: data['state'] as SessionState,
            currentIntent: data['currentIntent'] as Intent | null,
            country: data['country'] as string,
            privacyAccepted: data['privacyAccepted'] as boolean | undefined,
            privacyAcceptedAt: data['privacyAcceptedAt'] ? (data['privacyAcceptedAt'] as Timestamp).toDate() : undefined,
            responseMode: (data['responseMode'] as 'MINI' | 'DETAILED') || 'MINI', // Default to MINI for existing sessions
            context: data['context'] as SessionContext,
            createdAt: (data['createdAt'] as Timestamp).toDate(),
            updatedAt: (data['updatedAt'] as Timestamp).toDate(),
            expiresAt: (data['expiresAt'] as Timestamp).toDate(),
        };

        // Check if session has expired
        if (session.expiresAt < new Date()) {
            // Session expired, create new one
            return createNewSession(docRef, platform, chatId, userId);
        }

        // Update expiry time
        await docRef.update({
            updatedAt: Timestamp.now(),
            expiresAt: getExpiryTimestamp(),
        });

        return session;
    }

    // Create new session
    return createNewSession(docRef, platform, chatId, userId);
}

/**
 * Create a new session
 */
async function createNewSession(
    docRef: FirebaseFirestore.DocumentReference,
    platform: Platform,
    chatId: string,
    userId: string
): Promise<Session> {
    const config = getConfig();
    const now = new Date();

    const session: Session = {
        sessionId: docRef.id,
        platform,
        chatId,
        userId,
        state: SESSION_STATES.IDLE,
        currentIntent: null,
        country: 'WHO',
        privacyAccepted: true,
        responseMode: 'MINI',
        context: {
            conversationHistory: [],
        },
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + config.sessionTtlMinutes * 60 * 1000),
    };

    await docRef.set({
        ...session,
        createdAt: Timestamp.fromDate(session.createdAt),
        updatedAt: Timestamp.fromDate(session.updatedAt),
        expiresAt: Timestamp.fromDate(session.expiresAt),
    });

    return session;
}

/**
 * Update session with new data
 */
export async function updateSession(
    sessionId: string,
    updates: Partial<Pick<Session, 'state' | 'currentIntent' | 'country' | 'context' | 'responseMode'>>
): Promise<void> {
    const firestore = getFirestore();
    const docRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);

    await docRef.update({
        ...updates,
        updatedAt: Timestamp.now(),
        expiresAt: getExpiryTimestamp(),
    });
}

/**
 * Add a conversation turn to session history
 */
export async function addConversationTurn(
    sessionId: string,
    turn: ConversationTurn
): Promise<void> {
    const firestore = getFirestore();
    const docRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);

    const doc = await docRef.get();
    if (!doc.exists) return;

    const data = doc.data()!;
    const context = data['context'] as SessionContext;
    const history = context.conversationHistory ?? [];

    // Keep only last 5 turns
    const updatedHistory = [...history, turn].slice(-5);

    await docRef.update({
        'context.conversationHistory': updatedHistory,
        updatedAt: Timestamp.now(),
        expiresAt: getExpiryTimestamp(),
    });
}

/**
 * Set user's country preference
 */
export async function setSessionCountry(
    sessionId: string,
    country: string
): Promise<void> {
    const firestore = getFirestore();
    const docRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);

    await docRef.update({
        country,
        state: SESSION_STATES.IDLE,
        updatedAt: Timestamp.now(),
        expiresAt: getExpiryTimestamp(),
    });
}

/**
 * Mark privacy policy as accepted
 */
export async function markPrivacyAccepted(sessionId: string): Promise<void> {
    const firestore = getFirestore();
    const docRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);

    await docRef.update({
        privacyAccepted: true,
        privacyAcceptedAt: Timestamp.now(),
        // Move to next state automatically
        state: SESSION_STATES.AWAITING_COUNTRY,
        updatedAt: Timestamp.now(),
        expiresAt: getExpiryTimestamp(),
    });
}

/**
 * Clear/expire a session
 */
export async function expireSession(sessionId: string): Promise<void> {
    const firestore = getFirestore();
    const docRef = firestore.collection(SESSIONS_COLLECTION).doc(sessionId);
    await docRef.delete();
}

/**
 * Helper to get expiry timestamp
 */
function getExpiryTimestamp(): Timestamp {
    const config = getConfig();
    return Timestamp.fromDate(
        new Date(Date.now() + config.sessionTtlMinutes * 60 * 1000)
    );
}
