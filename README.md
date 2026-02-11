# MedInfo Bot

AI-powered clinical decision support chatbot for healthcare professionals.

## Features

- 💊 **Drug Information** - Indications, contraindications, side effects
- ⚠️ **Drug Interactions** - Check interactions with severity levels
- 💉 **Dosage Calculator** - Standard, pediatric, renal adjustments
- 📋 **Clinical Guidelines** - Evidence-based treatment recommendations
- 🌍 **Multi-Region Support** - Localized guidelines by country

## Tech Stack

- **Runtime:** Node.js 20 + TypeScript
- **Compute:** Google Cloud Functions
- **Database:** Firebase Firestore
- **AI:** Google Gemini API
- **Platforms:** Telegram + WhatsApp

## Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Development
npm run dev

# Build
npm run build

# Deploy
npm run deploy
```

## Documentation

- [PRD](./docs/PRD.md) - Product requirements
- [Architecture](./docs/ARCHITECTURE.md) - System design
- [API Specs](./docs/API_SPECIFICATIONS.md) - API documentation
- [Conversation Design](./docs/CONVERSATION_DESIGN.md) - UX flows

## License

Private - All rights reserved
