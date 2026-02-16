/**
 * Message Processor
 * 
 * Core orchestration for processing incoming messages
 */

import type { NormalizedMessage, Session } from '../types/message.types.js';
import type { BotResponse } from '../types/response.types.js';
import { INTENTS, SESSION_STATES, SUPPORTED_COUNTRIES } from '../config/constants.js';
import * as sessionService from '../services/session.service.js';
import * as llmService from '../services/llm.service.js';

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
            if (message.commandArgs?.length) {
                const mode = message.commandArgs[0].toUpperCase();
                if (mode === 'MINI' || mode === 'DETAILED') {
                    await sessionService.updateSession(session.sessionId, {
                        responseMode: mode,
                    });
                    return createResponse(`✅ Response mode set to: **${mode}**`, startTime);
                }
            }
            return createResponse('Please specify mode. Example: /mode mini or /mode detailed', startTime);

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
        switch (value) {
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
                const newMode = session.responseMode === 'MINI' ? 'DETAILED' : 'MINI';
                await sessionService.updateSession(session.sessionId, {
                    responseMode: newMode,
                });
                return createResponse(`✅ Switched to **${newMode}** mode.`, startTime);
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

        // Generate response using LLM
        console.log('[processQuery] Generating LLM response...');
        const llmResponse = await llmService.generateResponse({
            sessionId: session.sessionId,
            userCountry: session.country,
            userMode: session.responseMode || 'DETAILED',
            intent,
            userMessage: message.text,
            extractedEntities: {},
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

        // Dynamic Mode Button
        const nextMode = session.responseMode === 'MINI' ? 'DETAILED' : 'MINI';
        const modeEmoji = session.responseMode === 'MINI' ? '📖' : '⚡';
        const modeLabel = `${modeEmoji} Switch to ${nextMode}`;

        // Quick action buttons
        const quickActions = [
            [
                { text: '💊 Drug Info', callbackData: 'cmd:drug' },
                { text: '⚠️ Interaction', callbackData: 'cmd:interact' }
            ],
            [
                { text: '💉 Dosage', callbackData: 'cmd:dose' },
                { text: '📋 Guidelines', callbackData: 'cmd:guideline' }
            ],
            [
                { text: modeLabel, callbackData: 'cmd:mode' },
                { text: '🌍 Change Region', callbackData: 'cmd:country' }
            ]
        ];

        return {
            text: llmResponse.text,
            formattedText: {
                telegram: llmResponse.text,
                whatsapp: llmResponse.text,
            },
            inlineButtons: quickActions,
            fromCache: false,
            processingTimeMs: Date.now() - startTime,
            tokensUsed: llmResponse.tokensUsed.total,
        };
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
