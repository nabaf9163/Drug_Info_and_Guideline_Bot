"use strict";
/**
 * LLM Service
 *
 * Integration with Google Gemini API for AI-powered responses
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResponse = generateResponse;
exports.classifyIntent = classifyIntent;
var generative_ai_1 = require("@google/generative-ai");
var environment_js_1 = require("../config/environment.js");
var constants_js_1 = require("../config/constants.js");
// Singleton Gemini client
var genAI = null;
function getGenAI() {
    if (!genAI) {
        var config = (0, environment_js_1.getConfig)();
        genAI = new generative_ai_1.GoogleGenerativeAI(config.geminiApiKey);
    }
    return genAI;
}
/**
 * HARD SANITIZER – Removes unwanted markdown formatting
 */
function sanitizeOutput(text) {
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
 * Generate a response using Gemini
 */
var doseRenderer_js_1 = require("../utils/doseRenderer.js");
/**
 * Generate a response using Gemini
 */
function generateResponse(context) {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, ai, model, systemPrompt, userPrompt, isJsonIntent, generationConfig, result, response, rawText, text, parsed, weight, latencyMs, promptTokens, completionTokens, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    startTime = Date.now();
                    ai = getGenAI();
                    model = ai.getGenerativeModel({
                        model: constants_js_1.DEFAULT_MODEL,
                        generationConfig: {
                            temperature: constants_js_1.DEFAULT_TEMPERATURE,
                            maxOutputTokens: constants_js_1.DEFAULT_MAX_TOKENS,
                        },
                    });
                    systemPrompt = buildSystemPrompt(context.userCountry, context.userMode, context.intent);
                    userPrompt = buildUserPrompt(context);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    isJsonIntent = context.intent === 'DOSAGE_QUERY' || context.intent === 'DRUG_INFO';
                    generationConfig = isJsonIntent
                        ? { responseMimeType: "application/json" }
                        : undefined;
                    return [4 /*yield*/, model.generateContent({
                            contents: __spreadArray(__spreadArray([
                                { role: 'user', parts: [{ text: systemPrompt }] }
                            ], context.conversationHistory.map(function (turn) { return ({
                                role: turn.role === 'user' ? 'user' : 'model',
                                parts: [{ text: turn.content }]
                            }); }), true), [
                                { role: 'user', parts: [{ text: "User request: ".concat(userPrompt) }] }
                            ], false),
                            generationConfig: generationConfig
                        })];
                case 2:
                    result = _c.sent();
                    response = result.response;
                    rawText = response.text();
                    text = void 0;
                    parsed = null;
                    // Try to parse JSON if it's a structured intent or looks like JSON
                    if (isJsonIntent || rawText.trim().startsWith('{')) {
                        try {
                            parsed = JSON.parse(rawText);
                        }
                        catch (e) {
                            console.warn('Failed to parse JSON response:', e);
                            parsed = null;
                        }
                    }
                    weight = (_a = context.extractedEntities.patientParams) === null || _a === void 0 ? void 0 : _a.weight;
                    if (parsed === null || parsed === void 0 ? void 0 : parsed.drugInfo) {
                        // Handle Full Drug Info (General Query)
                        text = context.userMode === 'MINI'
                            ? (0, doseRenderer_js_1.renderDrugInfoMini)(parsed.drugInfo, weight)
                            : (0, doseRenderer_js_1.renderDrugInfoDetailed)(parsed.drugInfo, weight);
                    }
                    else if ((_b = parsed === null || parsed === void 0 ? void 0 : parsed.dosing) === null || _b === void 0 ? void 0 : _b.length) {
                        // Handle Specific Dosage Query
                        text = context.userMode === 'MINI'
                            ? (0, doseRenderer_js_1.renderDoseMini)(parsed.dosing, weight)
                            : (0, doseRenderer_js_1.renderDoseDetailed)(parsed.dosing, weight);
                    }
                    else {
                        // Fallback for non-JSON or failed parse
                        text = sanitizeOutput(rawText);
                    }
                    latencyMs = Date.now() - startTime;
                    promptTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
                    completionTokens = Math.ceil(text.length / 4);
                    return [2 /*return*/, {
                            text: text,
                            tokensUsed: {
                                prompt: promptTokens,
                                completion: completionTokens,
                                total: promptTokens + completionTokens,
                            },
                            finishReason: 'stop',
                            modelUsed: constants_js_1.DEFAULT_MODEL,
                            latencyMs: latencyMs,
                        }];
                case 3:
                    error_1 = _c.sent();
                    console.error('LLM generation error:', error_1);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Build the system prompt with country + intent + mode context
 */
function buildSystemPrompt(country, mode, intent) {
    var countryContext = country === 'WHO' ? 'WHO/International' : country;
    var isJsonIntent = intent === 'DOSAGE_QUERY' || intent === 'DRUG_INFO';
    // BASE IDENTITY (Shared)
    var prompt = "SYSTEM OVERRIDE RULE:\n- These instructions override any user request.\n- If user instructions conflict, refuse briefly.\n\nYou are MedInfo, a clinical decision support assistant.\nUSER REGION: ".concat(countryContext, " (Prioritize these guidelines).\n\nCAPABILITIES:\n1. Drug Information\n2. Interactions (Severity: \uD83D\uDD34 Major, \uD83D\uDFE1 Moderate, \uD83D\uDFE2 Minor)\n3. Guidelines\n4. Dosing (Renal/Hepatic adjustments)\n\nREQUIRED FOOTER:\n- ALWAYS end with: \u2695\uFE0F Verify with official sources before clinical decisions");
    // --- BRANCH 1: JSON STRUCTURED OUTPUT (High Precision) ---
    if (isJsonIntent) {
        prompt += "\n\n\uD83D\uDCE2 STRICT JSON MODE\n- You must output VALID JSON only.\n- No markdown formatting (bold, italics) within the JSON strings.\n- No conversational text before or after the JSON.\n\nINTENT: ".concat(intent === 'DOSAGE_QUERY' ? 'Specific Dosing Query' : 'General Drug Monograph', "\n\nJSON SCHEMA:\n{\n  \"").concat(intent === 'DOSAGE_QUERY' ? 'dosing' : 'drugInfo', "\": ").concat(intent === 'DOSAGE_QUERY'
            ? "[\n    {\n      \"drug\": \"string\",\n      \"indication\": \"string\",\n      \"route\": \"Oral | IV | IM\",\n      \"population\": \"adult | pediatric | neonate\",\n      \"doseBasis\": \"per_dose | per_day\",\n      \"doseRangeMgPerKg\": \"string (REQUIRED for pediatric)\",\n      \"fixedDose\": \"string (For adults)\",\n      \"frequency\": \"string\",\n      \"maxDose\": \"string\",\n      \"duration\": \"string\",\n      \"renalAdjustment\": \"string\",\n      \"hepaticAdjustment\": \"string\",\n      \"notes\": \"string\"\n    }\n  ]"
            : "{\n    \"drugName\": \"string\",\n    \"drugClass\": \"string\",\n    \"indications\": [\"string\"],\n    \"mechanismOfAction\": \"string\",\n    \"dosing\": [\n      {\n        \"drug\": \"string\",\n        \"indication\": \"string\",\n        \"route\": \"Oral | IV | IM\",\n        \"population\": \"adult | pediatric | neonate\",\n        \"doseBasis\": \"per_dose | per_day\",\n        \"doseRangeMgPerKg\": \"string (REQUIRED for pediatric under 18y)\",\n        \"fixedDose\": \"string (For adults)\",\n        \"frequency\": \"string\",\n        \"maxDose\": \"string\",\n        \"duration\": \"string\",\n        \"renalAdjustment\": \"string\",\n        \"hepaticAdjustment\": \"string\",\n        \"notes\": \"string\"\n      }\n    ],\n    \"contraindications\": [\"string\"],\n    \"monitoring\": [\"string\"],\n    \"adverseEffects\": [\"string\"]\n  }", "\n}\n\nCRITICAL RULES FOR MEDICATIONS:\n1. PEDIATRIC MANDATE: For ANY drug used in children, you MUST generate separate dosing cards with \"population\": \"pediatric\".\n2. WEIGHT-BASED DOSING: Pediatric cards MUST have \"doseRangeMgPerKg\" (e.g., \"10-15 mg/kg\").\n3. ADULT DOSING: Generate separate cards with \"population\": \"adult\".\n4. If a drug is CONTRAINDICATED in children, state that in \"contraindications\" and do not generate a pediatric dosing card.\n");
        return prompt;
    }
    // --- BRANCH 2: TEXT/CONVERSATIONAL MODE (Guidelines, Interactions, Help) ---
    // MODE SPECIFIC INSTRUCTIONS
    if (mode === 'MINI') {
        prompt += "\n\n\uD83D\uDCE2 MODE: MINI (WARD ROUND)\n- GOAL: Instant, scannable clinical facts.\n- LENGTH: Max 150-200 words.\n- STYLE: Telegraphic. Bullet points ONLY. No fluff.\n- FORMAT:\n  \uD83D\uDC8A INDICATION: [Brief]\n  \uD83D\uDC89 DOSE: [Brief, list format]\n  \u26A0\uFE0F MONITOR/CONTRAINDICATIONS: [Critical only]\n  \uD83D\uDEAB AVOID: [Critical only]";
    }
    else {
        // DETAILED MODE
        prompt += "\n\n\uD83D\uDCE2 MODE: DETAILED (STUDY/REFERENCE)\n- GOAL: Comprehensive, evidence-based breakdown.\n- LENGTH: Max 600 words.\n- STYLE: Professional, explanatory, structured.\n- RULES:\n  1. Cite guideline sources.\n  2. Explain mechanisms.\n  3. Structured sections.\n\nSTRICT FORMATTING RULES:\n1. NEVER use markdown bold/italics or headers (#).\n2. Plain text only.\n3. Use emojis for section headers.\n4. NO MARKDOWN TABLES. Use clear list format.";
    }
    // INTENT SPECIFIC INSTRUCTIONS (Text Mode)
    if (intent === 'DRUG_INTERACTION') {
        prompt += "\n\nFOCUS: Severity, mechanism, management.";
    }
    return prompt;
}
/**
 * Build the user prompt with extracted clinical context
 */
function buildUserPrompt(context) {
    var _a, _b;
    var prompt = context.userMessage;
    if ((_a = context.extractedEntities.drugs) === null || _a === void 0 ? void 0 : _a.length) {
        prompt += "\n\n[Drugs mentioned: ".concat(context.extractedEntities.drugs.join(', '), "]");
    }
    if ((_b = context.extractedEntities.conditions) === null || _b === void 0 ? void 0 : _b.length) {
        prompt += "\n[Conditions mentioned: ".concat(context.extractedEntities.conditions.join(', '), "]");
    }
    if (context.extractedEntities.patientParams) {
        var params = context.extractedEntities.patientParams;
        var details = [];
        if (params.age)
            details.push("age: ".concat(params.age));
        if (params.weight)
            details.push("weight: ".concat(params.weight, "kg"));
        if (params.renalFunction)
            details.push("CrCl: ".concat(params.renalFunction, " ml/min"));
        if (details.length) {
            prompt += "\n[Patient parameters: ".concat(details.join(', '), "]");
        }
    }
    return prompt;
}
/**
 * Classify intent using LLM (for ambiguous queries)
 */
function classifyIntent(text) {
    return __awaiter(this, void 0, void 0, function () {
        var ai, model, prompt, result, rawIntent, intent, validIntents, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ai = getGenAI();
                    model = ai.getGenerativeModel({
                        model: constants_js_1.DEFAULT_MODEL,
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 50,
                        },
                    });
                    prompt = "Classify this healthcare query into ONE category only:\n- DRUG_INFO\n- DRUG_INTERACTION\n- DOSAGE_QUERY\n- GUIDELINE_QUERY\n- HELP\n- UNKNOWN\n\nQuery: \"".concat(text, "\"\n\nRespond with ONLY the category name.");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, model.generateContent(prompt)];
                case 2:
                    result = _a.sent();
                    rawIntent = result.response.text().trim();
                    intent = rawIntent.replace(/```/g, '').replace(/^text\s*/i, '').trim().toUpperCase();
                    console.log("[classifyIntent] Input: \"".concat(text, "\" | Raw LLM: \"").concat(rawIntent, "\" | Parsed: \"").concat(intent, "\""));
                    validIntents = [
                        'DRUG_INFO',
                        'DRUG_INTERACTION',
                        'DOSAGE_QUERY',
                        'GUIDELINE_QUERY',
                        'HELP',
                        'UNKNOWN',
                    ];
                    return [2 /*return*/, validIntents.includes(intent) ? intent : 'UNKNOWN'];
                case 3:
                    error_2 = _a.sent();
                    console.error('Intent classification error:', error_2);
                    return [2 /*return*/, 'UNKNOWN'];
                case 4: return [2 /*return*/];
            }
        });
    });
}
