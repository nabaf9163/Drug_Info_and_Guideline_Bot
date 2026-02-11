/**
 * Telegram Client
 * 
 * Handles sending messages to Telegram Bot API
 */

import { getConfig } from '../config/environment.js';
import type { BotResponse } from '../types/response.types.js';
import { SUPPORTED_COUNTRIES } from '../config/constants.js';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface TelegramInlineButton {
    text: string;
    callback_data: string;
}

/**
 * Send a text message via Telegram
 */
export async function sendMessage(
    chatId: string,
    text: string,
    options?: {
        parseMode?: 'MarkdownV2' | 'HTML';
        replyMarkup?: object;
    }
): Promise<void> {
    const config = getConfig();
    const url = `${TELEGRAM_API_BASE}${config.telegramBotToken}/sendMessage`;
    const MAX_LENGTH = 4096;

    // Split message if too long
    const messages = [];
    if (text.length <= MAX_LENGTH) {
        messages.push(text);
    } else {
        // Split by newlines to avoid breaking words where possible
        let currentMessage = '';
        const lines = text.split('\n');

        for (const line of lines) {
            if ((currentMessage + line + '\n').length > MAX_LENGTH) {
                messages.push(currentMessage);
                currentMessage = line + '\n';
            } else {
                currentMessage += line + '\n';
            }
        }
        if (currentMessage) {
            messages.push(currentMessage);
        }
    }

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg.trim()) continue;

        const body: Record<string, unknown> = {
            chat_id: chatId,
            text: msg,
        };

        // Only set parse_mode if explicitly specified
        if (options?.parseMode) {
            body['parse_mode'] = options.parseMode;
        }

        // Attach buttons ONLY to the last message chunk
        if (options?.replyMarkup && i === messages.length - 1) {
            body['reply_markup'] = options.replyMarkup;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('Telegram API error:', error);
            }
        } catch (error) {
            console.error('Failed to send Telegram message:', error);
        }
    }
}

/**
 * Send a message with inline keyboard buttons
 */
export async function sendMessageWithButtons(
    chatId: string,
    text: string,
    buttons: TelegramInlineButton[][],
    parseMode?: 'MarkdownV2' | 'HTML'
): Promise<void> {
    await sendMessage(chatId, text, {
        parseMode,
        replyMarkup: {
            inline_keyboard: buttons,
        },
    });
}

/**
 * Send the welcome message with country selection
 */
export async function sendWelcomeMessage(chatId: string): Promise<void> {
    const welcomeText = `👋 *Welcome to MedInfo\\!*

I'm your AI\\-powered clinical assistant, designed to help healthcare professionals make evidence\\-based decisions faster\\.

*Here is what I can do for you:*

💊 *Drug Information*
Get dosing, side effects, contraindications, and pharmacology for thousands of medications\\.
_Try: "Tell me about Amoxicillin"_

⚠️ *Interaction Checker*
Check for drug\\-drug interactions and receive severity warnings with mechanism explanations\\.
_Try: "Interaction between Warfarin and Aspirin"_

📋 *Clinical Guidelines*
Access national and international Standard Treatment Guidelines \\(STGs\\) for various conditions\\.
_Try: "Malaria treatment guidelines"_

💉 *Dosage Helper*
Calculate pediatric doses or renal adjustments instantly\\.
_Try: "Paracetamol dose for 15kg child"_

*How to use me:*
You can just type your questions naturally like you're talking to a colleague\\!

👇 *First, please select your region below so I can provide the correct local guidelines:*`;

    // Create rows of country buttons
    const countryButtons: TelegramInlineButton[][] = [];
    let currentRow: TelegramInlineButton[] = [];

    SUPPORTED_COUNTRIES.forEach((country, index) => {
        currentRow.push({
            text: `${country.emoji} ${country.name}`,
            callback_data: `country:${country.code}`,
        });

        if ((index + 1) % 2 === 0) {
            countryButtons.push(currentRow);
            currentRow = [];
        }
    });

    if (currentRow.length > 0) {
        countryButtons.push(currentRow);
    }

    await sendMessageWithButtons(chatId, welcomeText, countryButtons, 'MarkdownV2');
}

/**
 * Send privacy policy consent request
 */
export async function sendPrivacyConsent(chatId: string): Promise<void> {
    await sendMessageWithButtons(
        chatId,
        `🔒 *Privacy Policy Consent*

To continue using MedInfo Bot, please review and accept our Privacy Policy\\.

We collect limited data to provide drug information and do not sell your personal details\\. We share query data with Google Cloud AI services for processing\\.

[Read full policy](https://your-privacy-policy-url.com)`, // Ideally configure this URL
        [
            [
                { text: '📄 View Policy Summary', callback_data: 'view_privacy' },
            ],
            [
                { text: '✅ Accept & Continue', callback_data: 'accept_privacy' }
            ]
        ],
        'MarkdownV2'
    );
}

/**
 * Send country confirmation message
 */
export async function sendCountryConfirmation(
    chatId: string,
    countryCode: string
): Promise<void> {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
    const countryName = country ? `${country.emoji} ${country.name}` : countryCode;

    const text = `✅ *Region set to: ${escapeMarkdown(countryName)}*

Now you can ask me anything\\! Try:
• "What is metformin\\?"
• "Warfarin and aspirin interaction"
• /help — See all commands

⚕️ _For healthcare professionals only\\. Always verify with official sources\\._`;

    await sendMessage(chatId, text, { parseMode: 'MarkdownV2' });
}

/**
 * Send help message
 */
export async function sendHelpMessage(chatId: string, currentCountry: string): Promise<void> {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === currentCountry);
    const countryDisplay = country ? `${country.emoji} ${country.name}` : currentCountry;

    const text = `📖 *MedInfo Help*

*Commands:*
/drug \\<name\\> — Drug information
/interact \\<drug1\\>, \\<drug2\\> — Interaction check
/dose \\<drug\\> \\<details\\> — Dosage calculation
/guideline \\<condition\\> — Treatment guideline
/country — Change your region
/cancel — Reset conversation

*Example queries:*
• "What is metformin\\?"
• "Can I give warfarin with ibuprofen\\?"
• "Amoxicillin dose for 12kg child"
• "Hypertension treatment guideline"

*Tips:*
• Use generic drug names for best results
• Include patient weight/age for pediatric dosing
• Include CrCl for renal dose adjustments

🌍 Current region: ${escapeMarkdown(countryDisplay)}`;

    await sendMessage(chatId, text, { parseMode: 'MarkdownV2' });
}

/**
 * Send a bot response
 */
export async function sendBotResponse(
    chatId: string,
    response: BotResponse
): Promise<void> {
    const text = response.formattedText.telegram || escapeMarkdown(response.text);

    if (response.inlineButtons?.length) {
        const buttons = response.inlineButtons.map(row =>
            row.map(btn => ({
                text: btn.text,
                callback_data: btn.callbackData,
            }))
        );
        await sendMessageWithButtons(chatId, text, buttons);
    } else {
        await sendMessage(chatId, text);
    }
}

/**
 * Answer a callback query (acknowledges button press)
 */
export async function answerCallbackQuery(
    callbackQueryId: string,
    text?: string
): Promise<void> {
    const config = getConfig();
    const url = `${TELEGRAM_API_BASE}${config.telegramBotToken}/answerCallbackQuery`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text,
            }),
        });
    } catch (error) {
        console.error('Failed to answer callback query:', error);
    }
}

/**
 * Escape special characters for MarkdownV2
 */
export function escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
