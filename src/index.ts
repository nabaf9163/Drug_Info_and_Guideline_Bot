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
        console.log('=== Telegram webhook received ===');
        console.log('Method:', req.method);
        console.log('Body:', JSON.stringify(req.body, null, 2));

        try {
            // Validate request method
            if (req.method !== 'POST') {
                console.log('Rejected: Not POST');
                res.status(405).send('Method Not Allowed');
                return;
            }

            // Check if secrets are available
            console.log('TELEGRAM_BOT_TOKEN exists:', !!process.env['TELEGRAM_BOT_TOKEN']);
            console.log('GEMINI_API_KEY exists:', !!process.env['GEMINI_API_KEY']);

            // Parse the Telegram update
            const message = parseTelegramUpdate(req.body);
            console.log('Parsed message:', message ? JSON.stringify(message) : 'null');

            if (!message) {
                console.log('No message parsed, returning OK');
                res.status(200).send('OK');
                return;
            }

            // Acknowledge callback query immediately
            if (message.callbackQueryId) {
                console.log('Answering callback query:', message.callbackQueryId);
                await telegramClient.answerCallbackQuery(message.callbackQueryId);
            }

            // Process the message
            console.log('Processing message...');
            const response = await processMessage(message);
            console.log('Response:', JSON.stringify(response));

            // Handle special response types
            if (response.text === '__WELCOME__') {
                console.log('Sending welcome message');
                await telegramClient.sendWelcomeMessage(message.chatId);
            } else if (response.text === '__HELP__') {
                const country = (response as { country?: string }).country ?? 'WHO';
                console.log('Sending help message for country:', country);
                await telegramClient.sendHelpMessage(message.chatId, country);
            } else if (response.text === '__COUNTRY_SELECT__') {
                console.log('Sending country selection');
                await telegramClient.sendWelcomeMessage(message.chatId);
            } else if (response.text === '__COUNTRY_CONFIRMED__') {
                const country = (response as { country?: string }).country ?? 'WHO';
                console.log('Sending country confirmation:', country);
                await telegramClient.sendCountryConfirmation(message.chatId, country);
            } else {
                console.log('Sending bot response');
                await telegramClient.sendBotResponse(message.chatId, response);
            }

            console.log('Message processed successfully:', message.messageId);
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
            env: {
                telegramToken: !!process.env['TELEGRAM_BOT_TOKEN'],
                geminiKey: !!process.env['GEMINI_API_KEY'],
                gcloudProject: process.env['GCLOUD_PROJECT'] ?? 'not set',
            }
        });
    }
);
