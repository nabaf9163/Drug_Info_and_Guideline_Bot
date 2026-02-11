# Implementation Plan
## Drug Info and Guideline Bot

**Version:** 1.0  
**Date:** January 18, 2026  

---

## 1. Technology Stack (Final Decisions)

### 1.1 Core Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Language** | TypeScript | Type safety, better DX, ecosystem |
| **Runtime** | Node.js 20 LTS | Async, performance, GCP support |
| **Framework** | Express.js (minimal) | Lightweight, webhook handling |
| **Compute** | Google Cloud Functions (Gen 2) | Serverless, auto-scaling, cost-effective |
| **Database** | Firebase Firestore | Serverless, real-time, TTL support |
| **LLM** | Google Gemini API (`gemini-2.0-flash`) | Cost-effective, fast, accurate |
| **Secrets** | Google Secret Manager | Secure API key storage |
| **Logging** | Google Cloud Logging | Native integration, analytics |

### 1.2 Development Tools

| Tool | Purpose |
|------|---------|
| pnpm | Package manager (fast, efficient) |
| ESLint + Prettier | Code quality |
| Vitest | Unit testing |
| Firebase Emulator | Local development |
| ngrok | Local webhook testing |

### 1.3 Project Structure

```
Drug_Info_and_Guideline_Bot/
├── docs/                          # Documentation (you are here)
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── API_SPECIFICATIONS.md
│   ├── CONVERSATION_DESIGN.md
│   └── IMPLEMENTATION_PLAN.md
│
├── src/
│   ├── index.ts                   # Cloud Function entry point
│   ├── config/
│   │   ├── environment.ts         # Env config
│   │   └── constants.ts           # App constants
│   │
│   ├── webhooks/
│   │   ├── telegram.handler.ts    # Telegram webhook
│   │   └── whatsapp.handler.ts    # WhatsApp webhook
│   │
│   ├── core/
│   │   ├── messageProcessor.ts    # Message orchestration
│   │   ├── intentClassifier.ts    # Intent detection
│   │   ├── entityExtractor.ts     # Extract drugs, params
│   │   └── responseFormatter.ts   # Format responses per platform
│   │
│   ├── services/
│   │   ├── llm.service.ts         # Gemini API integration
│   │   ├── session.service.ts     # Session management (Firestore)
│   │   ├── cache.service.ts       # Response caching
│   │   └── analytics.service.ts   # Query logging
│   │
│   ├── platforms/
│   │   ├── telegram.client.ts     # Telegram Bot API client
│   │   └── whatsapp.client.ts     # WhatsApp Cloud API client
│   │
│   ├── prompts/
│   │   ├── system.prompt.ts       # Base system prompt
│   │   ├── drugInfo.prompt.ts     # Drug info template
│   │   ├── interaction.prompt.ts  # Interaction check template
│   │   ├── dosage.prompt.ts       # Dosage calc template
│   │   └── guideline.prompt.ts    # Guideline template
│   │
│   ├── types/
│   │   ├── message.types.ts       # Message interfaces
│   │   ├── session.types.ts       # Session interfaces
│   │   └── response.types.ts      # Response interfaces
│   │
│   └── utils/
│       ├── crypto.ts              # Hashing, anonymization
│       ├── validators.ts          # Input validation
│       └── formatters.ts          # Text formatting helpers
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── firebase.json                  # Firebase config
├── firestore.rules                # Security rules
├── firestore.indexes.json         # Firestore indexes
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 2. Development Phases

### Phase 0: Project Setup (Day 1)
- [ ] Initialize Node.js project with TypeScript
- [ ] Configure ESLint, Prettier, Vitest
- [ ] Set up Firebase project
- [ ] Configure Cloud Functions environment
- [ ] Create `.env` structure and Secret Manager secrets
- [ ] Set up Git repository

### Phase 1: Core Infrastructure (Days 2-3)
- [ ] Implement webhook handlers (Telegram, WhatsApp)
- [ ] Create normalized message parser
- [ ] Set up Firestore collections (sessions, queryLogs, cache)
- [ ] Implement session management service
- [ ] Add request logging (anonymized)
- [ ] Deploy skeleton to Cloud Functions

### Phase 2: LLM Integration (Days 4-5)
- [ ] Integrate Gemini API service
- [ ] Create prompt templates for all intents
- [ ] Implement intent classification (keyword + LLM hybrid)
- [ ] Build entity extraction (drug names, patient params)
- [ ] Add response caching logic
- [ ] Test with sample queries

### Phase 3: Platform Clients (Days 6-7)
- [ ] Implement Telegram Bot API client
- [ ] Implement WhatsApp Cloud API client
- [ ] Add platform-specific response formatting
- [ ] Handle inline keyboards (Telegram)
- [ ] Handle quick replies (WhatsApp)
- [ ] Test end-to-end on both platforms

### Phase 4: Bot Features (Days 8-10)
- [ ] Implement `/start` and `/help` commands
- [ ] Build drug information flow
- [ ] Build drug interaction flow
- [ ] Build dosage calculation flow
- [ ] Build clinical guideline flow
- [ ] Add follow-up question handling
- [ ] Implement conversation context retention

### Phase 5: Reliability & Polish (Days 11-12)
- [ ] Add error handling and fallback responses
- [ ] Implement rate limiting
- [ ] Add retry logic for LLM calls
- [ ] Optimize response times
- [ ] Add health check endpoint
- [ ] Security review (signature validation, input sanitization)

### Phase 6: Testing & Documentation (Days 13-14)
- [ ] Write unit tests (>70% coverage target)
- [ ] Write integration tests
- [ ] End-to-end testing on Telegram
- [ ] End-to-end testing on WhatsApp
- [ ] Update README with setup instructions
- [ ] Create deployment runbook

### Phase 7: Deployment & Launch (Day 15)
- [ ] Final security audit
- [ ] Deploy to production environment
- [ ] Configure monitoring and alerting
- [ ] Beta test with small user group
- [ ] Gather feedback and iterate
- [ ] Official launch

---

## 3. Detailed Implementation Tasks

### 3.1 Phase 0: Project Setup

```bash
# Initialize project
mkdir Drug_Info_and_Guideline_Bot
cd Drug_Info_and_Guideline_Bot
pnpm init
pnpm add typescript @types/node -D
npx tsc --init

# Add dependencies
pnpm add express @google-cloud/firestore @google/generative-ai
pnpm add -D @types/express vitest eslint prettier

# Firebase setup
firebase init functions firestore
```

**Environment Variables:**
```env
# .env.example
NODE_ENV=development

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=

# WhatsApp
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

# Google Cloud
GOOGLE_CLOUD_PROJECT=
GEMINI_API_KEY=

# App Settings
SESSION_TTL_MINUTES=30
CACHE_TTL_HOURS=24
RATE_LIMIT_PER_MINUTE=30
LOG_LEVEL=info
```

---

### 3.2 Phase 1: Core Infrastructure

**Key Files to Implement:**

1. **`src/index.ts`** - Cloud Function entry points
```typescript
// Exports for Cloud Functions
export { telegramWebhook } from './webhooks/telegram.handler';
export { whatsappWebhook } from './webhooks/whatsapp.handler';
export { healthCheck } from './webhooks/health.handler';
```

2. **`src/webhooks/telegram.handler.ts`** - Telegram webhook
3. **`src/webhooks/whatsapp.handler.ts`** - WhatsApp webhook
4. **`src/services/session.service.ts`** - Firestore session CRUD

---

### 3.3 Phase 2: LLM Integration

**Key Files to Implement:**

1. **`src/services/llm.service.ts`**
```typescript
// Core methods:
// - generateResponse(context: LLMContext): Promise<LLMResponse>
// - classifyIntent(text: string): Promise<Intent>
// - extractEntities(text: string): Promise<Entities>
```

2. **`src/prompts/*.prompt.ts`** - All prompt templates

3. **`src/core/intentClassifier.ts`**
```typescript
// Hybrid classification:
// 1. Check for commands (/drug, /interact, etc.)
// 2. Keyword matching for common patterns
// 3. Fall back to LLM for ambiguous queries
```

---

### 3.4 Phase 3: Platform Clients

**Key Files to Implement:**

1. **`src/platforms/telegram.client.ts`**
```typescript
// Methods:
// - sendMessage(chatId, text, options?)
// - sendWithButtons(chatId, text, buttons)
// - answerCallbackQuery(queryId, text?)
```

2. **`src/platforms/whatsapp.client.ts`**
```typescript
// Methods:
// - sendTextMessage(to, text)
// - sendInteractiveMessage(to, text, buttons)
// - markAsRead(messageId)
```

---

## 4. Testing Strategy

### 4.1 Test Types

| Type | Coverage Target | Tools |
|------|-----------------|-------|
| Unit tests | 70%+ | Vitest |
| Integration tests | Key flows | Vitest + Firebase Emulator |
| E2E tests | Critical paths | Manual + Postman |

### 4.2 Test Scenarios

**Unit Tests:**
- Intent classification accuracy
- Entity extraction (drug names, dosage params)
- Response formatting per platform
- Cache key generation
- Session TTL handling

**Integration Tests:**
- Webhook → Processor → LLM → Response
- Session create/update/expire flow
- Cache hit/miss behavior

**E2E Tests:**
- Full conversation: `/start` → drug query → follow-up
- Interaction check with multiple drugs
- Dosage calculation with patient parameters
- Error handling (invalid input, rate limit)

---

## 5. Deployment Configuration

### 5.1 Cloud Functions Config

```yaml
# firebase.json
{
  "functions": {
    "runtime": "nodejs20",
    "region": "us-central1",
    "source": ".",
    "predeploy": ["npm run build"],
    "codebase": "drugbot"
  }
}
```

### 5.2 Function Definitions

```typescript
// Telegram webhook
export const telegramWebhook = onRequest({
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 100,
}, telegramHandler);

// WhatsApp webhook  
export const whatsappWebhook = onRequest({
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 100,
}, whatsappHandler);
```

### 5.3 Webhook URLs

```
Telegram: https://{region}-{project}.cloudfunctions.net/telegramWebhook
WhatsApp: https://{region}-{project}.cloudfunctions.net/whatsappWebhook
```

---

## 6. Monitoring & Alerting

### 6.1 Key Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High error rate | Error rate > 5% over 5 min | Critical |
| High latency | p95 > 5s over 5 min | Warning |
| LLM failures | > 10 failures in 1 min | Critical |
| Rate limit hits | > 100 in 5 min | Info |

### 6.2 Dashboard Metrics

- Requests per second
- Latency percentiles (p50, p95, p99)
- Error rate by type
- Active users (DAU)
- LLM token usage
- Cache hit rate

---

## 7. Cost Estimation

### 7.1 Monthly Cost (Est. 1000 queries/day)

| Service | Usage | Est. Cost |
|---------|-------|-----------|
| Cloud Functions | 30K invocations | ~$0 (free tier) |
| Firestore | 100K reads, 50K writes | ~$5 |
| Gemini API | 500K tokens | ~$0.35 |
| Cloud Logging | 1GB logs | ~$0.50 |
| **Total** | | **~$6/month** |

> [!NOTE]
> Costs scale with usage. At 10K queries/day, expect ~$50/month.

---

## 8. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM hallucination | Medium | High | Remind users to verify; structured prompts |
| API rate limits | Medium | Medium | Caching, request batching |
| Platform API changes | Low | Medium | Abstract platform clients |
| Security breach | Low | Critical | Input validation, no PHI storage |
| Cost overrun | Low | Medium | Monitoring, usage alerts, cached responses |

---

## 9. Future Roadmap (Post-v1.0)

### v1.1 (Month 2)
- [ ] User registration (optional)
- [ ] Query history for registered users
- [ ] Favorite drugs feature

### v1.2 (Month 3)
- [ ] Multi-language support (French, Portuguese)
- [ ] Voice message transcription
- [ ] Image/prescription OCR

### v2.0 (Month 6)
- [ ] EHR integration (HL7 FHIR)
- [ ] Custom institutional formularies
- [ ] Team features (shared drug lists)
- [ ] Offline mode (companion app)

---

## 10. Success Criteria for v1.0

| Metric | Target |
|--------|--------|
| Response accuracy | > 95% (spot-checked) |
| Response time (p95) | < 5 seconds |
| Uptime | > 99% |
| User satisfaction | > 4/5 rating |
| Queries handled | 100+ per day within first month |

---

## 11. Open Items Before Implementation

> [!IMPORTANT]
> Please confirm the following before we proceed to coding:

1. **Firebase Project:** Use existing or create new?
2. **GCP Region:** Preferred deployment region (us-central1 recommended)?
3. **Telegram Bot:** Already created via @BotFather?
4. **WhatsApp Access:** Have WhatsApp Business API access?
5. **Drug Database Sources:** Any preferred data sources or fully LLM-based?
6. **Branding:** Bot name, icon, description for platforms?
7. **Launch Timeline:** Any specific deadline?

---

*Ready to proceed to implementation after review and approval.*
