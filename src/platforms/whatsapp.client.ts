/**
 * WhatsApp Cloud API Client
 * 
 * Handles sending messages to WhatsApp via Meta Cloud API
 */

import { getConfig } from '../config/environment.js';
import type { BotResponse } from '../types/response.types.js';
import { SUPPORTED_COUNTRIES, WHATSAPP_MESSAGE_LIMIT } from '../config/constants.js';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendMessage(to: string, text: string): Promise<void> {
    const config = getConfig();
    const url = `${WHATSAPP_API_BASE}/${config.whatsappPhoneNumberId}/messages`;

    // Split message if too long
    const messages: string[] = [];
    if (text.length <= WHATSAPP_MESSAGE_LIMIT) {
        messages.push(text);
    } else {
        let currentMessage = '';
        const lines = text.split('\n');

        for (const line of lines) {
            if ((currentMessage + line + '\n').length > WHATSAPP_MESSAGE_LIMIT) {
                if (currentMessage) messages.push(currentMessage.trim());
                currentMessage = line + '\n';
            } else {
                currentMessage += line + '\n';
            }
        }
        if (currentMessage.trim()) {
            messages.push(currentMessage.trim());
        }
    }

    for (const msg of messages) {
        if (!msg) continue;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.whatsappAccessToken}`,
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to,
                    type: 'text',
                    text: { body: msg },
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('WhatsApp API error:', error);
            }
        } catch (error) {
            console.error('Failed to send WhatsApp message:', error);
        }
    }
}

/**
 * Send an interactive message with buttons
 */
export async function sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: { type: 'reply', reply: { id: string, title: string } }[],
    headerText?: string
): Promise<void> {
    const config = getConfig();
    const url = `${WHATSAPP_API_BASE}/${config.whatsappPhoneNumberId}/messages`;

    // WhatsApp allows max 3 buttons per interactive message
    const buttonRows = buttons.slice(0, 3).map(btn => ({
        type: 'reply' as const,
        reply: {
            id: btn.reply.id,
            title: btn.reply.title.substring(0, 20), // WhatsApp button title max 20 chars
        },
    }));

    const interactiveBody: Record<string, unknown> = { text: bodyText };
    if (headerText) {
        interactiveBody.header = {
            type: 'text',
            text: headerText,
        };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.whatsappAccessToken}`,
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: interactiveBody,
                    action: {
                        buttons: buttonRows,
                    },
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('WhatsApp interactive button message error:', error);
        }
    } catch (error) {
        console.error('Failed to send WhatsApp interactive button message:', error);
    }
}

/**
 * Send an interactive message with buttons (max 3 buttons)
 */
export async function sendMessageWithButtons(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
): Promise<void> {
    const config = getConfig();
    const url = `${WHATSAPP_API_BASE}/${config.whatsappPhoneNumberId}/messages`;

    // WhatsApp allows max 3 buttons per interactive message
    const buttonRows = buttons.slice(0, 3).map(btn => ({
        type: 'reply' as const,
        reply: {
            id: btn.id,
            title: btn.title.substring(0, 20), // WhatsApp button title max 20 chars
        },
    }));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.whatsappAccessToken}`,
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text },
                    action: {
                        buttons: buttonRows,
                    },
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('WhatsApp button message error:', error);
        }
    } catch (error) {
        console.error('Failed to send WhatsApp button message:', error);
    }
}

/**
 * Send an interactive list message (for country selection, supports up to 10 items)
 */
export async function sendInteractiveList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
    }>
): Promise<void> {
    const config = getConfig();
    const url = `${WHATSAPP_API_BASE}/${config.whatsappPhoneNumberId}/messages`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.whatsappAccessToken}`,
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive: {
                    type: 'list',
                    body: { text: bodyText },
                    action: {
                        button: buttonText,
                        sections,
                    },
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('WhatsApp list message error:', error);
        }
    } catch (error) {
        console.error('Failed to send WhatsApp list message:', error);
    }
}

/**
 * Send privacy policy consent request
 */
export async function sendPrivacyConsent(chatId: string): Promise<void> {
    await sendInteractiveButtons(
        chatId,
        `👋 *Welcome to MedInfo Bot!*

We use AI to provide drug information and guidelines. To continue, please review and accept our Privacy Policy.

✅ *We protect your data* according to global standards.
📄 *View Policy* to see details.`,
        [
            { type: 'reply', reply: { id: 'view_privacy', title: '📄 View Privacy Policy' } },
            { type: 'reply', reply: { id: 'accept_privacy', title: '✅ Accept & Continue' } }
        ],
        'Privacy & Terms'
    );
}

/**
 * Send the welcome message with country selection
 */
export async function sendWelcomeMessage(to: string): Promise<void> {
    const welcomeText = `👋 *Welcome to MedInfo!*

I'm your AI-powered clinical assistant for healthcare professionals.

💊 *Drug Information* — dosing, side effects, contraindications
⚠️ *Interaction Checker* — drug-drug interaction warnings
📋 *Clinical Guidelines* — national & international STGs
💉 *Dosage Helper* — pediatric doses & renal adjustments

Just type your questions naturally!

👇 *First, select your region for local guidelines:*`;

    // Build country rows for the list
    const countryRows = SUPPORTED_COUNTRIES.map(country => ({
        id: `country:${country.code}`,
        title: `${country.emoji} ${country.name}`,
    }));

    await sendInteractiveList(
        to,
        welcomeText,
        '🌍 Select Region',
        [{
            title: 'Available Regions',
            rows: countryRows,
        }]
    );
}

/**
 * Send country confirmation message
 */
export async function sendCountryConfirmation(
    to: string,
    countryCode: string
): Promise<void> {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
    const countryName = country ? `${country.emoji} ${country.name}` : countryCode;

    const text = `✅ *Region set to: ${countryName}*

Now you can ask me anything! Try:
• "What is metformin?"
• "Warfarin and aspirin interaction"
• "Amoxicillin dose for 15kg child"

Type /help for all commands.

⚕️ _For healthcare professionals only. Always verify with official sources._`;

    await sendMessage(to, text);
}

/**
 * Send help message
 */
export async function sendHelpMessage(to: string, currentCountry: string): Promise<void> {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === currentCountry);
    const countryDisplay = country ? `${country.emoji} ${country.name}` : currentCountry;

    const text = `📖 *MedInfo Help*

*Commands:*
/drug <name> — Drug information
/interact <drug1>, <drug2> — Interaction check
/dose <drug> <details> — Dosage calculation
/guideline <condition> — Treatment guideline
/country — Change your region
/cancel — Reset conversation

*Example queries:*
• "What is metformin?"
• "Can I give warfarin with ibuprofen?"
• "Amoxicillin dose for 12kg child"
• "Hypertension treatment guideline"

*Tips:*
• Use generic drug names for best results
• Include patient weight/age for pediatric dosing
• Include CrCl for renal dose adjustments

🌍 Current region: ${countryDisplay}`;

    await sendMessage(to, text);
}

/**
 * WhatsApp persistent menu configuration
 */
const MAIN_MENU = {
    buttonText: '☰ Menu',
    sections: [
        {
            title: 'Core Functions',
            rows: [
                { id: 'cmd:drug', title: '💊 Drug Info', description: 'Dosing, side effects, etc.' },
                { id: 'cmd:interact', title: '🔄 Interactions', description: 'Check drug interactions' },
                { id: 'cmd:dose', title: '💉 Dosage Helper', description: 'Pediatric & renal dosing' },
                { id: 'cmd:guideline', title: '📋 Guidelines', description: 'Treatment protocols' },
            ]
        },
        {
            title: 'Settings & Help',
            rows: [
                { id: 'cmd:country', title: '🌍 Change Region', description: 'Switch local guidelines' },
                { id: 'cmd:help', title: '❓ Help', description: 'Show commands & tips' },
            ]
        }
    ]
};

/**
 * Send a bot response (routes BotResponse to appropriate WhatsApp method)
 */
export async function sendBotResponse(
    to: string,
    response: BotResponse
): Promise<void> {
    // Use WhatsApp-formatted text, or fall back to plain text
    const text = response.formattedText.whatsapp || response.text;

    // Send the main text message
    await sendMessage(to, text);

    // Contextual Menu (Persistent)
    // Always append the Main Menu to allow easy navigation
    await sendInteractiveList(
        to,
        'What would you like to do next?',
        MAIN_MENU.buttonText,
        MAIN_MENU.sections
    );
}

/**
 * Mark a message as read (WhatsApp best practice)
 */
export async function markAsRead(messageId: string): Promise<void> {
    const config = getConfig();
    const url = `${WHATSAPP_API_BASE}/${config.whatsappPhoneNumberId}/messages`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.whatsappAccessToken}`,
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            }),
        });
    } catch (error) {
        console.error('Failed to mark message as read:', error);
    }
}
