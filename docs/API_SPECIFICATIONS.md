# API Specifications
## Drug Info and Guideline Bot

**Version:** 1.0  
**Date:** January 18, 2026  

---

## 1. Overview

This document defines the internal APIs, webhook handlers, and LLM prompt specifications for the Drug Info and Guideline Bot.

---

## 2. Webhook Endpoints

### 2.1 Telegram Webhook

**Endpoint:** `POST /webhook/telegram`

**Headers:**
```
Content-Type: application/json
X-Telegram-Bot-Api-Secret-Token: {webhook_secret}  // Optional, for validation
```

**Request Body (Telegram Update Object):**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1234,
    "from": {
      "id": 987654321,
      "first_name": "John",
      "username": "johndoe"
    },
    "chat": {
      "id": 987654321,
      "type": "private"
    },
    "date": 1705595448,
    "text": "/drug metformin"
  }
}
```

**Response:** `200 OK` (empty body or `{"ok": true}`)

**Processing Flow:**
1. Validate request signature (if configured)
2. Extract message and chat details
3. Route to message processor
4. Send response via Telegram Bot API

---

### 2.2 WhatsApp Webhook

**Endpoint:** `POST /webhook/whatsapp`

**Verification (GET request for setup):**
```
GET /webhook/whatsapp?hub.mode=subscribe&hub.verify_token={token}&hub.challenge={challenge}
Response: {challenge} (plain text)
```

**Headers:**
```
Content-Type: application/json
X-Hub-Signature-256: sha256={signature}
```

**Request Body (WhatsApp Cloud API):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "phone_number_id": "PHONE_ID",
          "display_phone_number": "15551234567"
        },
        "contacts": [{
          "profile": { "name": "John Doe" },
          "wa_id": "15559876543"
        }],
        "messages": [{
          "from": "15559876543",
          "id": "wamid.xxx",
          "timestamp": "1705595448",
          "type": "text",
          "text": { "body": "What is metformin used for?" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Response:** `200 OK`

---

## 3. Internal Service APIs

### 3.1 Message Processor

```typescript
interface MessageProcessorService {
  /**
   * Process an incoming message from any platform
   * @param message - Normalized message object
   * @returns Bot response object
   */
  processMessage(message: NormalizedMessage): Promise<BotResponse>;
}
```

---

### 3.2 Intent Classifier

```typescript
interface IntentClassifierService {
  /**
   * Classify the intent of a user message
   * @param text - Raw message text
   * @param context - Optional session context
   * @returns Classified intent with confidence
   */
  classifyIntent(
    text: string, 
    context?: SessionContext
  ): Promise<IntentResult>;
}

interface IntentResult {
  intent: Intent;
  confidence: number;        // 0.0 to 1.0
  extractedEntities: {
    drugs?: string[];
    conditions?: string[];
    dosageParams?: DosageParams;
  };
}

interface DosageParams {
  patientAge?: number;
  patientWeight?: number;    // kg
  renalFunction?: number;    // CrCl ml/min or eGFR
  hepaticFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
}
```

**Intent Classification Patterns:**

| Intent | Keywords/Patterns | Examples |
|--------|-------------------|----------|
| `DRUG_INFO` | "what is", "tell me about", "information on", drug name only | "What is metformin?", "Amlodipine" |
| `DRUG_INTERACTION` | "interact", "combine", "together", "with", drug pairs | "Can I give warfarin with aspirin?" |
| `DOSAGE_QUERY` | "dose", "dosage", "how much", weight/age mentions | "Amoxicillin dose for 15kg child" |
| `GUIDELINE_QUERY` | "guideline", "treatment", "how to treat", "management" | "Hypertension treatment guideline" |
| `HELP` | "/help", "help", "what can you do" | "/help" |

---

### 3.3 Session Manager

```typescript
interface SessionManagerService {
  /**
   * Get or create a session for a chat
   * @param platform - Messaging platform
   * @param chatId - Platform chat ID
   * @returns Session object
   */
  getOrCreateSession(
    platform: Platform, 
    chatId: string
  ): Promise<Session>;

  /**
   * Update session context after a query
   * @param sessionId - Session identifier
   * @param updates - Partial session updates
   */
  updateSession(
    sessionId: string, 
    updates: Partial<Session>
  ): Promise<void>;

  /**
   * Clear/expire a session
   * @param sessionId - Session identifier
   */
  expireSession(sessionId: string): Promise<void>;
}
```

---

### 3.4 LLM Service

```typescript
interface LLMService {
  /**
   * Generate a response using the LLM
   * @param context - LLM context with prompt and history
   * @returns Generated response with metadata
   */
  generateResponse(context: LLMContext): Promise<LLMResponse>;
}

interface LLMResponse {
  text: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: 'stop' | 'length' | 'safety';
  modelUsed: string;
  latencyMs: number;
}
```

---

### 3.5 Cache Service

```typescript
interface CacheService {
  /**
   * Check if a response is cached
   * @param intent - Query intent
   * @param normalizedQuery - Normalized query string
   * @returns Cached response or null
   */
  getFromCache(
    intent: Intent, 
    normalizedQuery: string
  ): Promise<CachedResponse | null>;

  /**
   * Store a response in cache
   * @param intent - Query intent
   * @param normalizedQuery - Normalized query string
   * @param response - Response to cache
   * @param ttlHours - Time to live in hours
   */
  setCache(
    intent: Intent,
    normalizedQuery: string,
    response: string,
    ttlHours: number
  ): Promise<void>;
}
```

---

## 4. Platform Response APIs

### 4.1 Telegram Send Message

**Endpoint:** `POST https://api.telegram.org/bot{token}/sendMessage`

```json
{
  "chat_id": 987654321,
  "text": "💊 *Metformin*\n├─ Class: Biguanide...",
  "parse_mode": "MarkdownV2",
  "reply_markup": {
    "inline_keyboard": [
      [
        {"text": "📋 Side Effects", "callback_data": "side_effects:metformin"},
        {"text": "⚠️ Interactions", "callback_data": "interactions:metformin"}
      ],
      [
        {"text": "💉 Dosing", "callback_data": "dosing:metformin"}
      ]
    ]
  }
}
```

---

### 4.2 WhatsApp Send Message

**Endpoint:** `POST https://graph.facebook.com/v18.0/{phone_number_id}/messages`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Text Message:**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "15559876543",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "💊 *Metformin*\n├─ Class: Biguanide..."
  }
}
```

**Interactive Message (with buttons):**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "15559876543",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "💊 *Metformin*\nWhat would you like to know more about?"
    },
    "action": {
      "buttons": [
        {"type": "reply", "reply": {"id": "side_effects", "title": "Side Effects"}},
        {"type": "reply", "reply": {"id": "interactions", "title": "Interactions"}},
        {"type": "reply", "reply": {"id": "dosing", "title": "Dosing"}}
      ]
    }
  }
}
```

---

## 5. LLM Prompt Templates

### 5.1 System Prompt (Base)

```
You are DrugBot, a clinical decision support assistant for healthcare professionals (doctors, pharmacists, nurses).

YOUR CAPABILITIES:
1. Drug Information - Indications, contraindications, side effects, mechanisms
2. Drug-Drug Interactions - Check interactions, severity, mechanisms, alternatives
3. Clinical Guidelines - Evidence-based treatment recommendations
4. Dosage Calculations - Standard, pediatric, renal/hepatic adjustments

RULES:
1. Provide accurate, evidence-based information only
2. Always include severity levels for interactions (Major/Moderate/Minor)
3. Cite guideline sources when applicable (WHO, CDC, local formularies)
4. Format responses for mobile chat readability (use bullets, keep concise)
5. Include disclaimers: "Verify with official sources before clinical decisions"
6. Ask clarifying questions when information is insufficient
7. NEVER provide patient self-medication advice
8. State clearly when information is outside your knowledge

RESPONSE FORMAT:
- Use emojis for visual structure (💊 📋 ⚠️ ✅ ❌)
- Use bold for drug names and important terms
- Keep responses under 500 words
- Structure with clear sections
```

---

### 5.2 Drug Information Prompt

```
TASK: Provide drug information for {DRUG_NAME}

Include the following sections:
1. Drug Class
2. Mechanism of Action (brief)
3. Indications (main uses)
4. Contraindications
5. Common Side Effects (top 5)
6. Standard Adult Dosage
7. Important Warnings

Context from conversation:
{CONVERSATION_HISTORY}

User query: {USER_MESSAGE}
```

---

### 5.3 Drug Interaction Prompt

```
TASK: Check for drug-drug interactions between the following medications:
Drugs: {DRUG_LIST}

Provide for EACH interaction found:
1. Severity: Major / Moderate / Minor
2. Mechanism of interaction
3. Clinical significance
4. Management recommendation
5. Alternative drug suggestions if Major interaction

If no interactions found, state clearly "No significant interactions identified."

User query: {USER_MESSAGE}
```

---

### 5.4 Dosage Calculation Prompt

```
TASK: Calculate dosage for {DRUG_NAME}

Patient Parameters:
- Age: {AGE} (if provided)
- Weight: {WEIGHT} kg (if provided)
- Renal Function: CrCl {CRCL} ml/min or eGFR {EGFR} (if provided)
- Hepatic Function: {HEPATIC_STATUS} (if provided)

Provide:
1. Standard dose (if no adjustments needed)
2. Adjusted dose with rationale (if adjustments needed)
3. Frequency and route
4. Maximum daily dose
5. Special administration instructions

User query: {USER_MESSAGE}
```

---

### 5.5 Clinical Guideline Prompt

```
TASK: Provide treatment guideline for {CONDITION}

Include:
1. First-line treatment recommendations
2. Second-line alternatives
3. Key monitoring parameters
4. Treatment duration (if applicable)
5. Source/reference (WHO, CDC, national guidelines)

Specify if guidelines differ for:
- Pediatric patients
- Pregnant patients
- Elderly patients
- Patients with comorbidities

User query: {USER_MESSAGE}
```

---

## 6. Rate Limiting

### 6.1 Limits

| Limit Type | Value | Scope |
|------------|-------|-------|
| Per user | 30 requests/minute | Per chat ID |
| Per platform | 1000 requests/minute | Aggregate |
| LLM calls | 60 requests/minute | Gemini API quota |

### 6.2 Rate Limit Response

**HTTP 429 Too Many Requests**

Bot response to user:
```
⏳ You're sending queries too quickly. Please wait a moment and try again.
```

---

## 7. Error Handling

### 7.1 Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| `E001` | LLM API timeout | "I'm experiencing delays. Please try again shortly." |
| `E002` | LLM API error | "I couldn't process your request. Please try again." |
| `E003` | Rate limited | "You're sending queries too quickly. Please wait." |
| `E004` | Invalid input | "I didn't understand that. Try asking about a specific drug or condition." |
| `E005` | Session expired | "Your session has expired. Send a message to start fresh." |
| `E006` | Platform API error | "Message delivery failed. Please try again." |

### 7.2 Fallback Responses

```typescript
const FALLBACK_RESPONSES = {
  LLM_UNAVAILABLE: 
    "🔧 I'm currently experiencing technical difficulties. " +
    "Please try again in a few minutes or use /help for basic commands.",
  
  UNKNOWN_QUERY:
    "🤔 I'm not sure how to help with that. I can assist with:\n" +
    "• Drug information (/drug name)\n" +
    "• Drug interactions (/interact drug1, drug2)\n" +
    "• Dosage calculations (/dose drug details)\n" +
    "• Treatment guidelines (/guideline condition)",
  
  OUTSIDE_SCOPE:
    "⚠️ This query appears to be outside my clinical scope. " +
    "I can only help with drug and treatment information for healthcare professionals."
};
```

---

## 8. Callback Handlers (Telegram)

### 8.1 Callback Query Structure

```typescript
interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message: TelegramMessage;
  chat_instance: string;
  data: string;  // e.g., "side_effects:metformin"
}
```

### 8.2 Callback Data Format

```
{action}:{subject}:{optional_param}

Examples:
- side_effects:metformin
- interactions:metformin:aspirin
- dosing:metformin:pediatric
- more:drug_info:metformin
```

### 8.3 Callback Handler Response

```typescript
// Acknowledge callback
POST /answerCallbackQuery
{
  "callback_query_id": "query_id",
  "text": "Loading side effects...",  // Optional toast message
  "show_alert": false
}

// Update or send new message based on action
```

---

## 9. Health Check Endpoint

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-18T12:00:00Z",
  "services": {
    "database": "connected",
    "llm": "available",
    "telegram": "connected",
    "whatsapp": "connected"
  }
}
```
