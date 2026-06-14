/**
 * MedInfo Bot - Firebase Functions Entry Point
 * 
 * Exports Cloud Functions for Telegram and WhatsApp webhooks
 */

import { onRequest, HttpsFunction } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { initializeApp } from 'firebase-admin/app';
import { parseTelegramUpdate } from './webhooks/telegram.handler';
import { whatsappWebhook } from './webhooks/whatsapp.handler';
import { processMessage } from './core/messageProcessor';
import * as telegramClient from './platforms/telegram.client';
import { BOT_NAME, BOT_VERSION } from './config/constants';

// Initialize Firebase Admin
initializeApp();

// Set global options
setGlobalOptions({
    region: 'us-central1',
    maxInstances: 10,
    memory: '512MiB',
});

/**
 * Telegram Webhook - Main entry point for bot messages
 */
export const telegram: HttpsFunction = onRequest(
    {
        cors: false,
        timeoutSeconds: 60,
        secrets: ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY'],
    },
    async (req, res) => {
        try {
            if (req.method !== 'POST') {
                res.status(405).send('Method Not Allowed');
                return;
            }

            const message = parseTelegramUpdate(req.body);

            if (!message) {
                res.status(200).send('OK');
                return;
            }

            if (message.callbackQueryId) {
                await telegramClient.answerCallbackQuery(message.callbackQueryId);
            }

            const response = await processMessage(message);

            if (response.text === '__WELCOME__') {
                await telegramClient.sendWelcomeMessage(message.chatId);
            } else if (response.text === '__HELP__') {
                const country = (response as { country?: string }).country ?? 'WHO';
                await telegramClient.sendHelpMessage(message.chatId, country);
            } else if (response.text === '__COUNTRY_SELECT__') {
                await telegramClient.sendWelcomeMessage(message.chatId);
            } else if (response.text === '__COUNTRY_CONFIRMED__') {
                const country = (response as { country?: string }).country ?? 'WHO';
                await telegramClient.sendCountryConfirmation(message.chatId, country);
            } else {
                await telegramClient.sendBotResponse(message.chatId, response);
            }

            console.log('Processed Telegram message:', message.messageId);
            res.status(200).send('OK');

        } catch (error) {
            console.error('=== TELEGRAM WEBHOOK ERROR ===');
            console.error('Error:', error);
            console.error('Stack:', error instanceof Error ? error.stack : 'no stack');
            res.status(200).send('OK');
        }
    }
);

/**
 * WhatsApp Webhook - Entry point for WhatsApp messages
 */
export const whatsapp: HttpsFunction = onRequest(
    {
        cors: false,
        timeoutSeconds: 60,
        secrets: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'GEMINI_API_KEY'],
    },
    async (req, res) => {
        await whatsappWebhook(req, res);
    }
);

/**
 * Health Check endpoint
 */
export const health: HttpsFunction = onRequest(
    {
        cors: true,
    },
    async (_req, res) => {
        res.status(200).json({
            status: 'healthy',
            name: BOT_NAME,
            version: BOT_VERSION,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    }
);
