/**
 * WhatsApp Webhook Handler
 * 
 * Handles incoming webhook requests from WhatsApp Cloud API
 */

import type { Request, Response } from 'express';
import type { NormalizedMessage } from '../types/message.types.js';
import { PLATFORMS } from '../config/constants.js';
import { getConfig } from '../config/environment.js';
import { processMessage } from '../core/messageProcessor.js';
import * as whatsappClient from '../platforms/whatsapp.client.js';

// WhatsApp Cloud API types (simplified)
interface WhatsAppWebhookPayload {
    object: string;
    entry: WhatsAppEntry[];
}

interface WhatsAppEntry {
    id: string;
    changes: WhatsAppChange[];
}

interface WhatsAppChange {
    value: {
        messaging_product: string;
        metadata: {
            phone_number_id: string;
            display_phone_number: string;
        };
        contacts?: WhatsAppContact[];
        messages?: WhatsAppMessage[];
        statuses?: unknown[];
    };
    field: string;
}

interface WhatsAppContact {
    profile: { name: string };
    wa_id: string;
}

interface WhatsAppMessage {
    from: string;
    id: string;
    timestamp: string;
    type: 'text' | 'interactive' | 'button';
    text?: { body: string };
    interactive?: {
        type: string;
        button_reply?: { id: string; title: string };
        list_reply?: { id: string; title: string };
    };
}

/**
 * Parse WhatsApp webhook payload into normalized message
 */
export function parseWhatsAppPayload(payload: WhatsAppWebhookPayload): NormalizedMessage | null {
    const entry = payload.entry[0];
    const change = entry?.changes[0];
    const value = change?.value;

    // Ignore status updates (delivered, read, etc.)
    if (value?.statuses?.length) {
        return null;
    }

    if (!value?.messages?.length) {
        return null;
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    if (!message) return null;

    // Extract text based on message type
    let text = '';
    let callbackData: string | undefined;

    if (message.type === 'text' && message.text) {
        text = message.text.body;
    } else if (message.type === 'interactive' && message.interactive) {
        const reply = message.interactive.button_reply ?? message.interactive.list_reply;
        if (reply) {
            text = reply.title;
            callbackData = reply.id;
        }
    }

    if (!text) return null;

    // Extract command if present
    let command: string | undefined;
    let commandArgs: string[] | undefined;

    if (text.startsWith('/')) {
        const parts = text.split(' ');
        command = parts[0]?.toLowerCase();
        commandArgs = parts.slice(1);
    }

    return {
        messageId: message.id,
        platform: PLATFORMS.WHATSAPP,
        chatId: message.from,
        userId: message.from,
        userName: contact?.profile.name,
        text,
        command,
        commandArgs,
        callbackData,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        rawPayload: payload,
    };
}

/**
 * WhatsApp webhook handler for Cloud Functions
 */
export async function whatsappWebhook(req: Request, res: Response): Promise<void> {
    try {
        // Handle webhook verification (GET request)
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'] as string;
            const challenge = req.query['hub.challenge'];

            const config = getConfig();
            // Read directly from env and trim to handle any whitespace from secret manager
            const expectedToken = (process.env['WHATSAPP_VERIFY_TOKEN'] || config.whatsappVerifyToken || '').trim();

            console.log('Webhook verification attempt:', {
                mode,
                tokenReceived: token,
                tokenLength: token?.length,
                expectedLength: expectedToken.length,
                tokenMatch: token === expectedToken
            });

            if (mode === 'subscribe' && token === expectedToken) {
                console.log('WhatsApp webhook verified');
                res.status(200).send(challenge);
                return;
            }

            res.status(403).send('Forbidden');
            return;
        }

        // Handle incoming messages (POST request)
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }



        const payload = req.body as WhatsAppWebhookPayload;

        // Parse the payload
        const message = parseWhatsAppPayload(payload);

        if (!message) {
            res.status(200).send('OK');
            return;
        }

        console.log('WhatsApp message received:', message.messageId, 'from:', message.chatId);

        // Mark message as read
        await whatsappClient.markAsRead(message.messageId);

        // Process the message
        const response = await processMessage(message);

        // Route response to appropriate WhatsApp method
        console.log('[DEBUG] Routing response, text:', JSON.stringify(response.text));

        // const responseText = response.text.trim(); // Unused

        if (response.type === 'welcome') {
            await whatsappClient.sendWelcomeMessage(message.chatId);
        } else if (response.type === 'privacy_consent') {
            await whatsappClient.sendPrivacyConsent(message.chatId);
        } else if (response.type === 'help') {
            const country = (response as { country?: string }).country ?? 'WHO';
            await whatsappClient.sendHelpMessage(message.chatId, country);
        } else if (response.type === 'country_select') {
            await whatsappClient.sendWelcomeMessage(message.chatId);
        } else if (response.type === 'country_confirmed') {
            const country = (response as { country?: string }).country ?? 'WHO';
            await whatsappClient.sendCountryConfirmation(message.chatId, country);
        } else {
            await whatsappClient.sendBotResponse(message.chatId, response);
        }

        console.log('Processed WhatsApp message:', message.messageId);
        res.status(200).send('OK');

    } catch (error) {
        console.error('WhatsApp webhook error:', error);
        // Ensure request ends even on error, to avoid hanging
        if (!res.headersSent) {
            res.status(200).send('OK'); // Always return 200 to WhatsApp to stop retries on error
        }
    }
}
