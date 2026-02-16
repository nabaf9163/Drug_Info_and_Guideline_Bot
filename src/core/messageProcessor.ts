/**
 * Message Processor
 * 
 * Core orchestration for processing incoming messages
 */

import type { NormalizedMessage, Session } from '../types/message.types.js';
import type { BotResponse } from '../types/response.types.js';
import { INTENTS, SESSION_STATES, SUPPORTED_COUNTRIES, ADMIN_CHAT_IDS } from '../config/constants.js';
import * as sessionService from '../services/session.service.js';
import * as llmService from '../services/llm.service.js';
import * as extractionService from '../services/extraction.service.js';
import { trackingService } from '../services/tracking.service.js';
import { analyticsService } from '../services/analytics.service.js';


/**
 * Process an incoming message and generate a response
 */
export async function processMessage(message: NormalizedMessage): Promise<BotResponse> {
    const startTime = Date.now();
    console.log('[processMessage] Starting, text:', message.text?.substring(0, 50));

    // Get or create session
    const session = await sessionService.getOrCreateSession(
        message.platform,
        message.chatId,
        message.userId
    );
    console.log('[processMessage] Session loaded, state:', session.state, 'country:', session.country);

    // Handle commands first
    if (message.command) {
        console.log('[processMessage] Handling command:', message.command);
        return handleCommand(message, session, startTime);
    }

    // Handle callback data (button presses)
    if (message.callbackData) {
        console.log('[processMessage] Handling callback:', message.callbackData);
        return handleCallback(message, session, startTime);
    }

    // Handle based on session state
    console.log('[processMessage] Session state switch:', session.state);
    switch (session.state) {
        case SESSION_STATES.AWAITING_PRIVACY:
            // DISABLED: Privacy flow skipped by user request
            // Auto-accept and move to country selection
            console.log('[processMessage] Privacy flow disabled. Auto-accepting.');
            await sessionService.markPrivacyAccepted(session.sessionId);
            return createResponse(
                '__COUNTRY_SELECT__',
                startTime,
                { type: 'country_select' }
            );

        case SESSION_STATES.AWAITING_COUNTRY:
            // DISABLED: Defaulting to WHO by user request
            // Auto-set country and process query
            console.log('[processMessage] Country selection disabled. Defaulting to WHO.');
            await sessionService.setSessionCountry(session.sessionId, 'WHO');

            // Fallthrough to process query immediately
            return processQuery(message, session, startTime);

        /* DISABLED: Old logic
            // Try to parse country from text
            const countryMatch = findCountryInText(message.text);
            if (countryMatch) {
                await sessionService.setSessionCountry(session.sessionId, countryMatch);
                return createResponse(
                    `✅ Region set to: ${getCountryDisplay(countryMatch)}\n\nNow you can ask me anything! Try:\n• "What is metformin?"\n• /help — See all commands`,
                    startTime
                );
            }
            // If no country found, prompt with the interactive list again
            return createResponse(
                '__COUNTRY_SELECT__',
                startTime,
                { type: 'country_select' }
            );
        */

        case SESSION_STATES.IDLE:
        default:
            // Process natural language query
            console.log('[processMessage] Calling processQuery for:', message.text?.substring(0, 50));
            return processQuery(message, session, startTime);
    }
}

/**
 * Handle bot commands
 */
async function handleCommand(
    message: NormalizedMessage,
    session: Session,
    startTime: number
): Promise<BotResponse> {
    const command = message.command?.replace('/', '').toLowerCase();

    switch (command) {
        case 'stats':
            // Admin-only command
            if (!ADMIN_CHAT_IDS.includes(message.chatId)) {
                return createResponse(`Unknown command: ${command}. Type /help for available commands.`, startTime);
            }

            // Fetch stats (default to last 24 hours)
            const stats = await analyticsService.getStats(1);

            const statsText =
                `📊 **MedInfo Stats** (${stats.period})\n\n` +
                `👥 **Volume:** ${stats.totalQueries} queries\n` +
                `⏱ **Latency:** ${stats.avgLatencyMs}ms avg\n` +
                `🌍 **Top Region:** ${stats.topRegion}\n` +
                `✅ **Validation:** ${stats.validationPassRate}% pass\n` +
                `👍 **Feedback:** ${stats.feedbackScore}% positive\n\n` +
                `**Models:**\n${Object.entries(stats.modelUsage).map(([k, v]) => `• ${k}: ${v}`).join('\n') || '• No data'}\n\n` +
                `**Platforms:**\n${Object.entries(stats.platformBreakdown).map(([k, v]) => `• ${k}: ${v}`).join('\n') || '• No data'}`;

            return createResponse(statsText, startTime);

        case 'start':
            // Reset session state to awaiting country
            await sessionService.updateSession(session.sessionId, {
                state: SESSION_STATES.AWAITING_COUNTRY,
            });
            return createResponse('__WELCOME__', startTime, { type: 'welcome' });

        case 'help':
            return createResponse('__HELP__', startTime, { type: 'help', country: session.country });

        case 'country':
            await sessionService.updateSession(session.sessionId, {
                state: SESSION_STATES.AWAITING_COUNTRY,
            });
            return createResponse('__COUNTRY_SELECT__', startTime, { type: 'country_select' });

        case 'cancel':
        case 'cancel':
            // Fully expire/delete the session to simulate a fresh user
            await sessionService.expireSession(session.sessionId);
            return createResponse('🔄 Session reset complete.\n\nType "Hi" to start over.', startTime);

        case 'drug':
            if (message.commandArgs?.length) {
                const drugName = message.commandArgs.join(' ');
                return processQuery(
                    { ...message, text: `Tell me about ${drugName}` },
                    session,
                    startTime
                );
            }
            return createResponse('Please specify a drug name. Example: /drug metformin', startTime);

        case 'interact':
            if (message.commandArgs?.length) {
                const drugs = message.commandArgs.join(' ');
                return processQuery(
                    { ...message, text: `Check interaction between ${drugs}` },
                    session,
                    startTime
                );
            }
            return createResponse('Please specify drugs. Example: /interact warfarin, aspirin', startTime);

        case 'dose':
            if (message.commandArgs?.length) {
                const details = message.commandArgs.join(' ');
                return processQuery(
                    { ...message, text: `Dosage for ${details}` },
                    session,
                    startTime
                );
            }
            return createResponse('Please specify drug and details. Example: /dose amoxicillin 15kg child', startTime);

        case 'guideline':
            if (message.commandArgs?.length) {
                const condition = message.commandArgs.join(' ');
                return processQuery(
                    { ...message, text: `Treatment guideline for ${condition}` },
                    session,
                    startTime
                );
            }
            return createResponse('Please specify a condition. Example: /guideline hypertension', startTime);

            return createResponse('Please specify a condition. Example: /guideline hypertension', startTime);

        case 'mode':
            // Mode switching is deprecated — users now use the "Expand" button
            return createResponse('💡 Responses are now concise by default.\n\nTap the "📖 Expand this" button after any response to get a detailed breakdown.', startTime);

        default:
            return createResponse(`Unknown command: ${command}. Type /help for available commands.`, startTime);
    }
}

/**
 * Handle callback button presses
 */
async function handleCallback(
    message: NormalizedMessage,
    session: Session,
    startTime: number
): Promise<BotResponse> {
    const [action, value] = (message.callbackData ?? '').split(':');

    if (action === 'country' && value) {
        const country = SUPPORTED_COUNTRIES.find(c => c.code === value);
        if (country) {
            await sessionService.setSessionCountry(session.sessionId, value);
            return createResponse('__COUNTRY_CONFIRMED__', startTime, { type: 'country_confirmed', country: value });
        }
    }

    // Handle quick action commands
    if (action === 'cmd') {
        const intent = value; // Default assumption, might be overridden

        switch (value) {
            case 'good': {
                // Log positive feedback
                const feedbackIntent = (message.callbackData ?? '').split(':')[2] || 'UNKNOWN';
                trackingService.logFeedback({
                    sessionId: session.sessionId,
                    userId: message.userId,
                    intent: feedbackIntent,
                    mode: session.responseMode || 'MINI',
                    country: session.country,
                    rating: 'positive'
                }).catch(err => console.error('[tracking] Failed to log feedback:', err));

                return createResponse('✅ Thanks for the feedback!', startTime, { type: 'text' });
            }

            case 'bad': {
                // Check if reason is already provided (cmd:bad:intent:reason)
                const parts = (message.callbackData ?? '').split(':');
                const feedbackIntent = parts[2] || 'UNKNOWN';
                const reason = parts[3];

                if (reason) {
                    // Log negative feedback with reason
                    trackingService.logFeedback({
                        sessionId: session.sessionId,
                        userId: message.userId,
                        intent: feedbackIntent,
                        mode: session.responseMode || 'MINI',
                        country: session.country,
                        rating: 'negative',
                        reason: reason
                    }).catch(err => console.error('[tracking] Failed to log feedback:', err));

                    return createResponse('✅ Thanks for helping us improve!', startTime, { type: 'text' });
                }

                // If no reason, show reason buttons
                // "What went wrong?"
                const reasonButtons = [
                    [
                        { text: 'Incomplete', callbackData: `cmd:bad:${feedbackIntent}:incomplete` },
                        { text: 'Inaccurate', callbackData: `cmd:bad:${feedbackIntent}:inaccurate` },
                    ],
                    [
                        { text: 'Too Slow', callbackData: `cmd:bad:${feedbackIntent}:slow` },
                        { text: 'Other', callbackData: `cmd:bad:${feedbackIntent}:other` },
                    ]
                ];

                return {
                    text: 'What went wrong?',
                    formattedText: { telegram: 'What went wrong?', whatsapp: 'What went wrong?' },
                    inlineButtons: reasonButtons,
                    fromCache: false,
                    processingTimeMs: Date.now() - startTime,
                    tokensUsed: 0,
                };
            }

            case 'drug':
                return createResponse('Please specify a drug name. Example: "/drug metformin" or just ask "What is metformin?"', startTime);
            case 'interact':
                return createResponse('Please specify drugs to check. Example: "/interact warfarin, aspirin"', startTime);
            case 'dose':
                return createResponse('Please specify drug and details. Example: "/dose amoxicillin 15kg child"', startTime);
                return createResponse('Please specify a condition. Example: "/guideline hypertension"', startTime);
            case 'country':
                await sessionService.updateSession(session.sessionId, {
                    state: SESSION_STATES.AWAITING_COUNTRY,
                });
                return createResponse('__COUNTRY_SELECT__', startTime, { type: 'country_select' });
            case 'mode':
            case 'expand': {
                // One-shot expand: re-query a specific topic in DETAILED mode
                // Parse the optional turn index from callback data (e.g. "expand:4")
                const expandParts = (message.callbackData ?? '').split(':');
                const turnIndex = expandParts.length >= 3 ? parseInt(expandParts[2], 10) : NaN;
                const history = session.context.conversationHistory;

                let targetUserTurn;
                let targetAssistantTurn;

                if (!isNaN(turnIndex) && turnIndex >= 0 && turnIndex < history.length) {
                    // Use the specific turns referenced by the Expand button
                    targetUserTurn = history[turnIndex];
                    targetAssistantTurn = history[turnIndex + 1];
                } else {
                    // Fallback: use the last user/assistant turns
                    targetUserTurn = history.filter(t => t.role === 'user').pop();
                    targetAssistantTurn = history.filter(t => t.role === 'assistant').pop();
                }

                if (!targetUserTurn || !targetAssistantTurn) {
                    return createResponse('Nothing to expand yet. Ask me a question first!', startTime);
                }

                // Generate an expanded DETAILED response based on the previous MINI
                const expandResponse = await llmService.generateResponse({
                    sessionId: session.sessionId,
                    userCountry: session.country,
                    userMode: 'DETAILED',
                    intent: session.currentIntent || 'DRUG_INFO',
                    userMessage: targetUserTurn.content,
                    extractedEntities: {},
                    conversationHistory: session.context.conversationHistory.map(turn => ({
                        role: turn.role,
                        content: turn.content,
                    })),
                });

                // Save to history
                await sessionService.addConversationTurn(session.sessionId, {
                    role: 'assistant',
                    content: expandResponse.text,
                    timestamp: new Date(),
                });

                return {
                    text: expandResponse.text,
                    formattedText: {
                        telegram: expandResponse.text,
                        whatsapp: expandResponse.text,
                    },
                    fromCache: false,
                    processingTimeMs: Date.now() - startTime,
                    tokensUsed: expandResponse.tokensUsed.total,
                };
            }
        }
    }

    return createResponse('Invalid action. Please try again.', startTime);
}

/**
 * Process a natural language query
 */
async function processQuery(
    message: NormalizedMessage,
    session: Session,
    startTime: number
): Promise<BotResponse> {
    console.log('[processQuery] Starting for message:', message.text?.substring(0, 50));

    try {
        // Classify intent using LLM
        console.log('[processQuery] Classifying intent...');
        const intent = await llmService.classifyIntent(message.text);
        console.log('[processQuery] Intent classified as:', intent);

        // Update session with current intent
        await sessionService.updateSession(session.sessionId, {
            currentIntent: intent as typeof INTENTS[keyof typeof INTENTS],
            state: SESSION_STATES.PROCESSING,
        });

        // Extract structured entities (age, weight)
        const patientParams = extractionService.extractPatientParams(message.text || '');
        console.log('[processQuery] Extracted params:', JSON.stringify(patientParams));

        // Generate response using LLM
        console.log('[processQuery] Generating LLM response...');
        const llmResponse = await llmService.generateResponse({
            sessionId: session.sessionId,
            userCountry: session.country,
            userMode: session.responseMode || 'MINI',
            intent,
            userMessage: message.text,
            extractedEntities: {
                patientParams: {
                    age: patientParams.age,
                    weight: patientParams.weight,
                    renalFunction: patientParams.renalFunction,
                    isPediatric: patientParams.isPediatric
                }
            },
            conversationHistory: session.context.conversationHistory.map(turn => ({
                role: turn.role,
                content: turn.content,
            })),
        });
        console.log('[processQuery] LLM response received, length:', llmResponse.text.length);

        // Add to conversation history
        await sessionService.addConversationTurn(session.sessionId, {
            role: 'user',
            content: message.text,
            timestamp: new Date(),
        });
        await sessionService.addConversationTurn(session.sessionId, {
            role: 'assistant',
            content: llmResponse.text,
            timestamp: new Date(),
        });

        // Reset state to idle
        await sessionService.updateSession(session.sessionId, {
            state: SESSION_STATES.IDLE,
        });

        console.log('[processQuery] Returning response');

        // Inline button: "Expand this" with the user turn index so we expand the correct query
        // The user turn was just added at the current history length minus 2 (user, then assistant)
        const userTurnIndex = session.context.conversationHistory.length;
        const quickActions = [
            [
                { text: '📖 Expand this', callbackData: `cmd:expand:${userTurnIndex}` },
                { text: '👍', callbackData: `cmd:good:${intent}` },
                { text: '👎', callbackData: `cmd:bad:${intent}` },
            ]
        ];

        const response: BotResponse = {
            text: llmResponse.text,
            formattedText: {
                telegram: llmResponse.text,
                whatsapp: llmResponse.text,
            },
            inlineButtons: quickActions,
            fromCache: false,
            processingTimeMs: Date.now() - startTime,
            tokensUsed: llmResponse.tokensUsed.total,
            modelUsed: llmResponse.modelUsed,
        };

        // Fire-and-forget query logging
        trackingService.logQuery({
            message,
            sessionId: session.sessionId,
            country: session.country || 'unknown',
            intent,
            mode: session.responseMode || 'MINI',
            response: response,
            drugsDetected: patientParams.age ? [] : undefined // Placeholder, extraction service needs update to return drugs
        }).catch(err => console.error('[tracking] Failed to log query:', err));

        return response;
    } catch (error) {
        console.error('[processQuery] ERROR:', error);
        console.error('[processQuery] Stack:', error instanceof Error ? error.stack : 'no stack');
        throw error;
    }
}

/**
 * Helper to create a response object
 */
function createResponse(
    text: string,
    startTime: number,
    metadata?: { country?: string; type?: 'text' | 'privacy_consent' | 'welcome' | 'help' | 'country_select' | 'country_confirmed' }
): BotResponse {
    return {
        text,
        type: metadata?.type || 'text',
        formattedText: {
            telegram: text,
            whatsapp: text,
        },
        fromCache: false,
        processingTimeMs: Date.now() - startTime,
        tokensUsed: 0,
        ...metadata,
    };
}

/**
 * Find country code in text
 */
function findCountryInText(text: string): string | null {
    const lower = text.toLowerCase();
    for (const country of SUPPORTED_COUNTRIES) {
        if (
            lower.includes(country.code.toLowerCase()) ||
            lower.includes(country.name.toLowerCase())
        ) {
            return country.code;
        }
    }
    return null;
}

/**
 * Get display string for country
 */
function getCountryDisplay(code: string): string {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === code);
    return country ? `${country.emoji} ${country.name}` : code;
}
