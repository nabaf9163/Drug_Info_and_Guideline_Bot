/**
 * Telegram Webhook Handler
 * 
 * Handles incoming webhook requests from Telegram Bot API
 */

import type { Request, Response } from 'express';
import type { NormalizedMessage } from '../types/message.types.js';
import { PLATFORMS } from '../config/constants.js';
import { processMessage } from '../core/messageProcessor.js';
import * as telegramClient from '../platforms/telegram.client.js';

// Telegram Update types (simplified)
interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
}

interface TelegramMessage {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
    entities?: TelegramMessageEntity[];
}

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
}

interface TelegramChat {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
}

interface TelegramMessageEntity {
    type: string;
    offset: number;
    length: number;
}

interface TelegramCallbackQuery {
    id: string;
    from: TelegramUser;
    message?: TelegramMessage;
    data?: string;
}

/**
 * Parse Telegram update into normalized message
 */
export function parseTelegramUpdate(update: TelegramUpdate): NormalizedMessage | null {
    // Handle regular messages
    if (update.message?.text) {
        const message = update.message;
        const text = message.text as string; // We know it exists from the check above

        // Extract command if present
        let command: string | undefined;
        let commandArgs: string[] | undefined;

        if (text.startsWith('/')) {
            const parts = text.split(' ');
            command = parts[0]?.toLowerCase();
            commandArgs = parts.slice(1);
        }

        return {
            messageId: message.message_id.toString(),
            platform: PLATFORMS.TELEGRAM,
            chatId: message.chat.id.toString(),
            userId: message.from?.id.toString() ?? 'unknown',
            userName: message.from?.first_name,
            text,
            command,
            commandArgs,
            timestamp: new Date(message.date * 1000),
            rawPayload: update,
        };
    }

    // Handle callback queries (inline button presses)
    if (update.callback_query) {
        const callback = update.callback_query;
        return {
            messageId: callback.message?.message_id.toString() ?? 'callback',
            platform: PLATFORMS.TELEGRAM,
            chatId: callback.message?.chat.id.toString() ?? 'unknown',
            userId: callback.from.id.toString(),
            userName: callback.from.first_name,
            text: callback.data ?? '',
            callbackData: callback.data,
            callbackQueryId: callback.id,
            timestamp: new Date(),
            rawPayload: update,
        };
    }

    return null;
}

/**
 * Telegram webhook handler for Cloud Functions
 */
export async function telegramWebhook(req: Request, res: Response): Promise<void> {
    try {
        // Validate request
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const update = req.body as TelegramUpdate;

        // Parse the update
        const message = parseTelegramUpdate(update);

        if (!message) {
            // Acknowledge but ignore unsupported update types
            res.status(200).send('OK');
            return;
        }

        // Acknowledge callback query immediately
        if (message.callbackQueryId) {
            await telegramClient.answerCallbackQuery(message.callbackQueryId);
        }

        // Process the message
        const response = await processMessage(message);

        // Handle special response types
        console.log('[DEBUG v3] Routing response, text:', JSON.stringify(response.text));
        const responseText = response.text.trim();

        if (response.type === 'welcome') {
            await telegramClient.sendWelcomeMessage(message.chatId);
        } else if (response.type === 'help') {
            const country = (response as { country?: string }).country ?? 'WHO';
            await telegramClient.sendHelpMessage(message.chatId, country);
        } else if (response.type === 'privacy_consent') {
            await telegramClient.sendPrivacyConsent(message.chatId);
        } else if (response.type === 'country_select') {
            await telegramClient.sendWelcomeMessage(message.chatId);
        } else if (response.type === 'country_confirmed') {
            const country = (response as { country?: string }).country ?? 'WHO';
            await telegramClient.sendCountryConfirmation(message.chatId, country);
        } else {
            // Regular text response
            await telegramClient.sendBotResponse(message.chatId, response);
        }

        console.log('Processed Telegram message:', message.messageId);

        // Always respond 200 OK quickly to prevent Telegram retries
        res.status(200).send('OK');

    } catch (error) {
        console.error('Telegram webhook error:', error);
        // Still return 200 to prevent retries
        res.status(200).send('OK');
    }
}
