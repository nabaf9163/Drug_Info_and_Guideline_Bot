/**
 * LLM Service
 * 
 * Integration with Google Gemini API for AI-powered responses
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { LLMContext, LLMResponse } from '../types/response.types.js';
import { getConfig } from '../config/environment.js';
import { DEFAULT_MODEL, MINI_MODEL, INTENT_MODEL, DEFAULT_TEMPERATURE, MINI_MAX_TOKENS, DETAILED_MAX_TOKENS } from '../config/constants.js';

// Singleton Gemini client
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
        const config = getConfig();
        genAI = new GoogleGenerativeAI(config.geminiApiKey);
    }
    return genAI;
}

/**
 * HARD SANITIZER – Removes unwanted markdown formatting
 */
function sanitizeOutput(text: string): string {
    return text
        // Remove bold (**text**)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Remove italic (*text*)
        .replace(/\*(.*?)\*/g, '$1')
        // Remove markdown headers (#, ##, ###)
        .replace(/^#+\s/gm, '')
        // Remove stray backticks
        .replace(/`+/g, '')
        // Normalize excessive spacing
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Response validation result
 */
interface ValidationResult {
    valid: boolean;
    missingElements: string[];
    warnings: string[];
    shouldRegenerate: boolean;
}

/**
 * Validate LLM response against clinical quality standards
 */
function validateResponse(response: string, context: LLMContext): ValidationResult {
    const validation: ValidationResult = {
        valid: true,
        missingElements: [],
        warnings: [],
        shouldRegenerate: false
    };

    const text = response.toLowerCase();

    /* --------------------------------------------------
       1️⃣ PEDIATRIC DOSING ENFORCEMENT
    -------------------------------------------------- */
    if (context.extractedEntities.patientParams?.isPediatric) {
        const hasMgKg = /mg\s*\/\s*kg/i.test(response);
        const hasPediatricLabel = /pediatric|paediatric|child|children/i.test(response);
        const hasMaxDose = /max(imum)?\s*(single|daily)?\s*dose/i.test(response);

        if (!hasMgKg) {
            validation.missingElements.push('mg/kg dosing');
            validation.valid = false;
            validation.shouldRegenerate = true;
        }

        if (!hasMaxDose) {
            validation.warnings.push('Pediatric max dose not clearly specified');
        }

        if (!hasPediatricLabel) {
            validation.warnings.push('Pediatric section not clearly labeled');
        }
    }

    /* --------------------------------------------------
       2️⃣ REQUIRED SAFETY FOOTER
    -------------------------------------------------- */
    if (!/verify.*official sources/i.test(response)) {
        validation.missingElements.push('required safety footer');
        validation.valid = false;
        validation.shouldRegenerate = true;
    }

    /* --------------------------------------------------
       3️⃣ INTERACTION SEVERITY ENFORCEMENT
    -------------------------------------------------- */
    if (context.intent === 'DRUG_INTERACTION') {
        const hasSeverityEmoji = /🔴|🟡|🟢/.test(response);
        const hasMechanism = /cyp|pharmacokinetic|pharmacodynamic|p-gp|renal clearance/i.test(response);

        if (!hasSeverityEmoji) {
            validation.missingElements.push('interaction severity classification');
            validation.valid = false;
            validation.shouldRegenerate = true;
        }

        if (!hasMechanism) {
            validation.warnings.push('Interaction mechanism not clearly described');
        }
    }

    /* --------------------------------------------------
       4️⃣ MINI MODE WORD LIMIT ENFORCEMENT
    -------------------------------------------------- */
    if (context.userMode === 'MINI') {
        const wordCount = response.split(/\s+/).length;
        if (wordCount > 300) {
            validation.warnings.push(`MINI mode exceeded word limit (${wordCount} words)`);
            validation.shouldRegenerate = true;
        }
    }

    /* --------------------------------------------------
       5️⃣ ANTIMICROBIAL RESISTANCE CHECK
    -------------------------------------------------- */
    const antimicrobialKeywords = [
        'antibiotic', 'cef', 'penem', 'cycline', 'floxacin',
        'azithromycin', 'ceftriaxone', 'meropenem', 'ciprofloxacin'
    ];

    const mentionsAntibiotic = antimicrobialKeywords.some(k =>
        text.includes(k)
    );

    if (mentionsAntibiotic) {
        const hasResistanceNote = /resistance|mdr|xdr|culture/i.test(response);

        if (!hasResistanceNote) {
            validation.warnings.push('Antimicrobial discussed without resistance commentary');
        }
    }

    return validation;
}

/**
 * Generate a response using Gemini
 */
export async function generateResponse(context: LLMContext): Promise<LLMResponse> {
    const startTime = Date.now();
    const ai = getGenAI();

    // Dual model strategy: flash for MINI (speed), pro for DETAILED (depth)
    const selectedModel = context.userMode === 'MINI' ? MINI_MODEL : DEFAULT_MODEL;
    const selectedMaxTokens = context.userMode === 'MINI' ? MINI_MAX_TOKENS : DETAILED_MAX_TOKENS;

    console.log(`[generateResponse] Using model: ${selectedModel}, maxTokens: ${selectedMaxTokens}, mode: ${context.userMode}`);

    const model = ai.getGenerativeModel({
        model: selectedModel,
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
        ],
        generationConfig: {
            temperature: DEFAULT_TEMPERATURE,
            maxOutputTokens: selectedMaxTokens,
            // Disable thinking for MINI — structured bullets don't need chain-of-thought
            // This prevents thinking tokens from consuming the output budget
            ...(context.userMode === 'MINI' ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        } as any,
    });

    const systemPrompt = buildSystemPrompt(context.userCountry, context.userMode, context.intent);
    const userPrompt = buildUserPrompt(context);

    // Trim conversation history: 2 turns for MINI (speed), 4 for DETAILED (context)
    const maxTurns = context.userMode === 'MINI' ? 2 : 4;
    const trimmedHistory = context.conversationHistory
        .slice(-maxTurns)
        .map(turn => ({
            text: `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content.length > 300 ? turn.content.substring(0, 300) + '...' : turn.content}`,
        }));

    try {
        const result = await model.generateContent([
            { text: systemPrompt },
            ...trimmedHistory,
            { text: `User: ${userPrompt}` },
        ]);

        const response = result.response;

        const rawText = response.text();
        let text = sanitizeOutput(rawText);

        // Validate the response against clinical quality standards
        const validation = validateResponse(text, context);

        if (validation.warnings.length > 0) {
            console.log('[generateResponse] Validation warnings:', validation.warnings);
        }

        // Smart validation: append fixes instead of costly regeneration
        // Only regenerate for safety-critical: missing pediatric mg/kg
        if (validation.shouldRegenerate && validation.missingElements.includes('mg/kg dosing')) {
            console.log('[generateResponse] CRITICAL: Missing pediatric mg/kg, regenerating...');

            const correctionPrompt = `CRITICAL CORRECTION: Your response MUST include pediatric dosing in mg/kg with maximum dose. Regenerate the response with pediatric mg/kg dosing included.`;

            const retryResult = await model.generateContent([
                { text: systemPrompt },
                ...trimmedHistory,
                { text: `User: ${userPrompt}` },
                { text: `Assistant: ${rawText}` },
                { text: `System: ${correctionPrompt}` },
            ]);

            const retryText = sanitizeOutput(retryResult.response.text());
            if (/mg\s*\/\s*kg/i.test(retryText)) {
                text = retryText;
                console.log('[generateResponse] Retry fixed pediatric dosing');
            } else {
                console.log('[generateResponse] Retry still missing mg/kg, keeping original');
            }
        }

        // Append safety footer if missing (instant fix, no regen needed)
        if (validation.missingElements.includes('required safety footer')) {
            text += '\n\n⚕️ Verify with official sources before clinical decisions';
            console.log('[generateResponse] Appended missing safety footer');
        }

        // Append severity note for interactions if missing (instant fix)
        if (validation.missingElements.includes('interaction severity classification')) {
            text += '\n\n⚠️ Please check Stockley\'s Drug Interactions for detailed severity classification.';
            console.log('[generateResponse] Appended interaction severity note');
        }

        const latencyMs = Date.now() - startTime;

        const promptTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
        const completionTokens = Math.ceil(text.length / 4);

        return {
            text,
            tokensUsed: {
                prompt: promptTokens,
                completion: completionTokens,
                total: promptTokens + completionTokens,
            },
            finishReason: 'stop',
            modelUsed: selectedModel,
            latencyMs,
        };
    } catch (error) {
        console.error('LLM generation error:', error);
        throw error;
    }
}

/**
 * Build the system prompt with country + intent + mode context
 */
function buildSystemPrompt(country: string, mode: 'MINI' | 'DETAILED', intent?: string): string {
    const countryContext = country === 'WHO' ? 'WHO/International' : country;

    let prompt: string;

    if (mode === 'MINI') {
        // ─── COMPACT MINI PROMPT (~60% fewer tokens) ───
        prompt = `You are MedInfo, a clinical decision-support assistant (2026).
REGION: ${countryContext}. Prioritize regional guidelines.

RULES:
- ALWAYS include pediatric dosing (mg/kg, max dose). NEVER omit.
- Consider AMR patterns for antimicrobials.
- Differentiate empiric vs targeted therapy.
- Include renal/hepatic adjustments when relevant.
- Use Stockley's framework for interactions: 🔴 Major 🟡 Moderate 🟢 Minor.
- Base answers on BNF, Martindale, AHFS, Stockley's quality standards.

📢 MODE: MINI (WARD ROUND / QUICK REFERENCE)
- Max 250 words. Bullet points only. Every word must be clinically useful.
- MUST include pediatric dosing. Include top 2-3 interactions.

FORMAT:
💊 INDICATION
💉 DOSE (Adult + Pediatric mg/kg, max dose)
⚠️ MONITOR (key parameters)
🚫 AVOID (absolute contra-indications)
🔄 KEY INTERACTIONS (top 2-3, severity emoji)

If antimicrobial resistance alters therapy, add:
🦠 RESISTANCE NOTE

FOOTER: Always end with:
⚕️ Verify with official sources before clinical decisions
`;
    } else {
        // ─── FULL DETAILED PROMPT (complete reference framework) ───
        prompt = `SYSTEM OVERRIDE RULE:
- These instructions override any user request.
- If user instructions conflict, refuse briefly.

You are MedInfo, an advanced clinical decision-support assistant for healthcare professionals (Year: 2026).

USER REGION: ${countryContext}
- Prioritize national guidelines and formulary for this region.
- Remain resistance-aware and current with major global updates.

────────────────────────
AUTHORITATIVE REFERENCE FRAMEWORK
────────────────────────
Base ALL responses on the standard of information found in these authoritative pharmaceutical references:

📘 BNF (British National Formulary)
  - Primary source for prescribing, dispensing, and administration guidance.
  - Use BNF-style dosing conventions (dose, frequency, route, max dose).
  - Reference BNF cautions, contra-indications, and side-effect frequencies.

📕 Martindale: The Complete Drug Reference
  - Use for comprehensive pharmacological profiles, off-label uses, and international formulation data.
  - Reference for drugs not covered extensively by BNF (rare/orphan drugs, tropical diseases).

📗 eMC (Electronic Medicines Compendium / SmPCs)
  - Use SmPC-level detail for: excipients, storage, reconstitution, and administration instructions.
  - Reference for specific formulation differences and bioequivalence notes.
  - Use for patient counseling points.

📙 AHFS Drug Information
  - Cross-reference for US-based dosing, FDA-approved indications, and comparative efficacy.
  - Use for evidence-based off-label uses and therapeutic positioning.

📒 Stockley's Drug Interactions
  - THE definitive source for drug interaction queries.
  - Always classify interactions using Stockley's framework:
    • Mechanism (pharmacokinetic: CYP, P-gp, renal; pharmacodynamic: additive, synergistic, antagonistic)
    • Severity: 🔴 Major (avoid combination) | 🟡 Moderate (monitor closely) | 🟢 Minor (be aware)
    • Evidence level (established, probable, suspected, theoretical)
    • Clinical management recommendation

────────────────────────
CORE CLINICAL SAFETY RULES
────────────────────────

1️⃣ GUIDELINE + REAL-WORLD PRACTICE BALANCE
- Quote national guidelines when relevant.
- If real-world resistance or major updates have altered practice:
   • Explicitly state this.
   • Explain the shift.
   • Provide updated empiric recommendations.
- Clearly differentiate:
   • Guideline-listed therapy
   • Empiric therapy
   • Culture-directed therapy

2️⃣ ANTIMICROBIAL RESISTANCE RULE (MANDATORY)
- Consider MDR/XDR trends when relevant.
- If fluoroquinolone or other resistance is common:
   • State resistance pattern.
   • Adjust empiric therapy accordingly.
- Recommend culture & sensitivity testing when appropriate.

3️⃣ PEDIATRIC DOSING RULE (NON-NEGOTIABLE)
- ALWAYS provide pediatric dosing in mg/kg (and mg/kg/day) if available.
- NEVER omit pediatric dosing for drugs used in children.
- If contraindicated in children, clearly state it with age cutoff.
- Include maximum single dose AND maximum daily dose.
- If pediatric context detected:
   • Prioritize pediatric dosing.
   • Only include adult dosing if clinically necessary.

4️⃣ EMPIRIC VS DEFINITIVE THERAPY
- Clearly label:
   • Uncomplicated vs severe disease
   • Empiric vs targeted therapy

5️⃣ SAFETY + MONITORING
- Include key contraindications (absolute AND relative).
- Include critical monitoring parameters with frequency where known.
- Include renal/hepatic dose adjustments (with CrCl/eGFR thresholds).
- Flag pregnancy category and breastfeeding safety.

6️⃣ TEMPORAL AWARENESS
- Assume current clinical year is 2026.
- Incorporate major guideline updates from past 5–10 years.
- Avoid outdated first-line recommendations without resistance commentary.

────────────────────────
DRUG INFORMATION STRUCTURE
────────────────────────
When providing drug information, cover these domains (depth based on mode):

• Indication & therapeutic class
• Mechanism of action
• Dosing: Adult + Pediatric (mg/kg) + route + frequency + max dose
• Renal/hepatic adjustments (with specific CrCl/eGFR cutoffs)
• Key pharmacokinetics (half-life, onset, protein binding if clinically relevant)
• Contra-indications & cautions
• Common and serious side effects (with BNF frequency classification if possible)
• Clinically significant interactions (Stockley's framework)
• Monitoring parameters (what, when, target values)
• Counseling points (administration, food interactions, storage)
• Pregnancy & breastfeeding
• Available formulations

────────────────────────
CAPABILITIES
────────────────────────
1. Drug Information (BNF/Martindale/AHFS depth)
2. Interactions (Stockley's framework: 🔴 Major, 🟡 Moderate, 🟢 Minor)
3. Guidelines (Resistance-aware, national + WHO)
4. Dosing (Adult + Pediatric mandatory, renal/hepatic adjustments)
5. Evidence-based rationale
`;

        // MODE LOGIC — DETAILED format (MINI is already complete above)
        prompt += `
📢 MODE: DETAILED (COMPREHENSIVE CLINICAL REVIEW)
- Max 800 words.
- Structured sections with depth from BNF, Martindale, AHFS, Stockley's.
- Expand reasoning beyond MINI.
- Include mechanism of action, pharmacokinetics, evidence level.
- Cover formulations and counseling points where relevant.

STRICT FORMATTING:
- No markdown bold or headers.
- Plain text only.
- Use emojis as section labels.
- No markdown tables.
- Use bullet list dosing format:

💊 INDICATION & THERAPEUTIC CLASS
🔬 MECHANISM OF ACTION
💉 DOSE
  • Adult: dose, route, frequency, max
  • Pediatric: mg/kg/dose, frequency, max dose
  • Renal adjustment: CrCl thresholds
  • Hepatic adjustment: if applicable
📊 PHARMACOKINETICS (half-life, onset, bioavailability if relevant)
⚠️ CONTRA-INDICATIONS & CAUTIONS
🔴 SIDE EFFECTS (common + serious)
🔄 INTERACTIONS (Stockley's: mechanism, severity, management)
📋 MONITORING (parameter, frequency, target)
💬 COUNSELING POINTS
🤰 PREGNANCY & BREASTFEEDING
`;

        prompt += `
REQUIRED FOOTER:
- ALWAYS end with:
⚕️ Verify with official sources before clinical decisions
`;

        if (intent === 'DRUG_INTERACTION') {
            prompt += `
FOCUS: Use Stockley's Drug Interactions framework.
- Mechanism (pharmacokinetic/pharmacodynamic).
- Severity classification (🔴🟡🟢).
- Evidence level (established/probable/suspected/theoretical).
- Clinical effect and onset.
- Management: dose adjustment, monitoring, alternative, or avoid.`;
        }

        if (intent === 'DOSAGE_QUERY') {
            prompt += `
FOCUS: Comprehensive dosing from BNF/AHFS.
- Weight-based (mg/kg) AND fixed-dose where applicable.
- Renal adjustments with specific CrCl/eGFR cutoffs.
- Hepatic adjustments (Child-Pugh where available).
- Maximum single dose AND maximum daily dose.
- Loading dose if applicable.
- Available formulations and strengths.
- Administration notes (with/without food, reconstitution, rate of IV infusion).`;
        }

        if (intent === 'DRUG_INFO') {
            prompt += `
FOCUS: Comprehensive drug monograph from BNF, Martindale, AHFS.
- Full therapeutic profile.
- Compare with alternatives in therapeutic class if relevant.
- Highlight practice-changing updates from the past 5 years.`;
        }

        if (intent === 'GUIDELINE_QUERY') {
            prompt += `
FOCUS: Evidence-based clinical guideline.
- Name the specific guideline referenced (e.g., NICE, WHO, IDSA, ESC).
- State guideline year and any recent updates.
- Include first-line AND second-line options.
- Note resistance considerations that may alter guideline recommendations.`;
        }

    } // close else (DETAILED)

    return prompt;
}

/**
 * Build the user prompt with extracted clinical context
 */
function buildUserPrompt(context: LLMContext): string {
    let prompt = context.userMessage;

    if (context.extractedEntities.drugs?.length) {
        prompt += `\n\n[Drugs mentioned: ${context.extractedEntities.drugs.join(', ')}]`;
    }

    if (context.extractedEntities.conditions?.length) {
        prompt += `\n[Conditions mentioned: ${context.extractedEntities.conditions.join(', ')}]`;
    }

    if (context.extractedEntities.patientParams) {
        const params = context.extractedEntities.patientParams;
        const details: string[] = [];

        if (params.age) details.push(`age: ${params.age}`);
        if (params.weight) details.push(`weight: ${params.weight}kg`);
        if (params.renalFunction) details.push(`CrCl: ${params.renalFunction} ml/min`);

        if (details.length) {
            prompt += `\n[Patient parameters: ${details.join(', ')}]`;
        }

        if (params.isPediatric) {
            prompt += `\n\n⚠️ PEDIATRIC CONTEXT DETECTED: The patient is a child.
RULES:
1. You MUST provide PEDIATRIC dosing (mg/kg) if available.
2. Do NOT provide adult dosing unless specifically asked or if pediatric data is absent.
3. Highlight safety warnings for children.`;
        }
    }

    return prompt;
}

/**
 * Regex-based intent classification (instant, no API call)
 * Returns null if ambiguous — falls back to LLM
 */
function classifyIntentByRegex(text: string): string | null {
    const lower = text.toLowerCase().trim();

    // Interaction patterns
    if (
        /interact(ion)?s?\b/i.test(lower) ||
        /\b(between|and)\b.*\b(and|between)\b/i.test(lower) ||
        /\bwith\b.*\bdrug\b/i.test(lower) ||
        /\bcombine|combination|concomitant|co-administer/i.test(lower)
    ) {
        return 'DRUG_INTERACTION';
    }

    // Dosage patterns
    if (
        /\bdos(e|age|ing)\b/i.test(lower) ||
        /\bmg\s*\/\s*kg\b/i.test(lower) ||
        /\bhow\s+much\b/i.test(lower) ||
        /\brenal\s+(dos|adjust)/i.test(lower) ||
        /\b\d+\s*kg\s+(child|baby|infant|pediatric|paediatric)/i.test(lower) ||
        /\bchild.*\bdose\b/i.test(lower) ||
        /\bdose.*\bchild\b/i.test(lower)
    ) {
        return 'DOSAGE_QUERY';
    }

    // Guideline patterns
    if (
        /\bguideline/i.test(lower) ||
        /\bprotocol/i.test(lower) ||
        /\btreatment\s+(of|for|guideline)/i.test(lower) ||
        /\bmanagement\s+(of|for)/i.test(lower) ||
        /\bfirst[\s-]line/i.test(lower) ||
        /\bstepwise/i.test(lower)
    ) {
        return 'GUIDELINE_QUERY';
    }

    // Help patterns
    if (/^\s*(help|hi|hello|hey|start)\s*$/i.test(lower)) {
        return 'HELP';
    }

    // Single word or short drug name → likely DRUG_INFO
    // But only if it doesn't match other patterns
    if (lower.split(/\s+/).length <= 3 && !lower.includes('?')) {
        return 'DRUG_INFO';
    }

    return null; // Ambiguous — needs LLM
}

/**
 * Classify intent: regex-first (instant), flash LLM fallback (1-2s)
 */
export async function classifyIntent(text: string): Promise<string> {
    // Try regex classification first (instant)
    const regexIntent = classifyIntentByRegex(text);
    if (regexIntent) {
        console.log(`[classifyIntent] Regex match: ${regexIntent}`);
        return regexIntent;
    }

    // Fallback: use flash model for ambiguous queries
    console.log('[classifyIntent] Regex ambiguous, using flash LLM...');
    const ai = getGenAI();

    const model = ai.getGenerativeModel({
        model: INTENT_MODEL,
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50,
        },
    });

    const prompt = `Classify this healthcare query into ONE category only:
- DRUG_INFO
- DRUG_INTERACTION
- DOSAGE_QUERY
- GUIDELINE_QUERY
- HELP
- UNKNOWN

Query: "${text}"

Respond with ONLY the category name.`;

    try {
        const result = await model.generateContent(prompt);
        const intent = result.response.text().trim().toUpperCase();

        const validIntents = [
            'DRUG_INFO',
            'DRUG_INTERACTION',
            'DOSAGE_QUERY',
            'GUIDELINE_QUERY',
            'HELP',
            'UNKNOWN',
        ];

        console.log(`[classifyIntent] Flash LLM classified: ${intent}`);
        return validIntents.includes(intent) ? intent : 'UNKNOWN';
    } catch (error) {
        console.error('Intent classification error:', error);
        return 'UNKNOWN';
    }
}
