/**
 * Grounding Agent — Layer 2 of the Source of Truth Agent
 *
 * Dynamically selects authoritative sources based on query context
 * and builds a structured grounding directive for the LLM prompt.
 */

import {
    SOURCE_REGISTRY,
    type SourceEntry,
    type SourceDomain,
} from '../data/source-registry.js';

// ─── Intent-to-Domain Mapping ───

const INTENT_DOMAIN_MAP: Record<string, SourceDomain[]> = {
    DRUG_INFO: ['dosing', 'safety', 'pharmacokinetics', 'counseling'],
    DRUG_INTERACTION: ['interactions'],
    DOSAGE_QUERY: ['dosing', 'pediatrics', 'safety'],
    GUIDELINE_QUERY: ['guidelines', 'antimicrobials', 'cardiology', 'respiratory', 'nephrology', 'endocrinology', 'rheumatology', 'obstetrics', 'hepatology'],
    PATIENT_COUNSELING: ['counseling', 'safety'],
};

// ─── Specialty Keyword Detection ───

/** Maps clinical keywords in user queries to specialty domains for targeted source selection. */
const SPECIALTY_KEYWORDS: Record<string, SourceDomain> = {
    // Cardiology
    'hypertension': 'cardiology', 'heart failure': 'cardiology', 'atrial fibrillation': 'cardiology',
    'anticoagul': 'cardiology', 'statin': 'cardiology', 'acs': 'cardiology', 'myocardial': 'cardiology',
    'angina': 'cardiology', 'arrhythmia': 'cardiology', 'lipid': 'cardiology', 'cholesterol': 'cardiology',

    // Respiratory
    'asthma': 'respiratory', 'copd': 'respiratory', 'pneumonia': 'respiratory',
    'inhaler': 'respiratory', 'bronchitis': 'respiratory', 'tuberculosis': 'respiratory', 'tb ': 'respiratory',

    // Endocrinology
    'diabetes': 'endocrinology', 'insulin': 'endocrinology', 'metformin': 'endocrinology',
    'hba1c': 'endocrinology', 'thyroid': 'endocrinology', 'glucose': 'endocrinology',

    // Nephrology
    'ckd': 'nephrology', 'chronic kidney': 'nephrology', 'dialysis': 'nephrology',
    'renal': 'nephrology', 'egfr': 'nephrology', 'creatinine': 'nephrology',

    // Obstetrics
    'pregnancy': 'obstetrics', 'pregnant': 'obstetrics', 'breastfeed': 'obstetrics',
    'gestational': 'obstetrics', 'preeclampsia': 'obstetrics', 'antenatal': 'obstetrics', 'trimester': 'obstetrics',

    // Rheumatology
    'rheumatoid': 'rheumatology', 'lupus': 'rheumatology', 'gout': 'rheumatology',
    'arthritis': 'rheumatology', 'autoimmune': 'rheumatology',

    // Hepatology
    'hepatitis': 'hepatology', 'cirrhosis': 'hepatology', 'liver disease': 'hepatology',
    'nafld': 'hepatology', 'nash': 'hepatology',
};

/**
 * Detect specialty domains from query keywords.
 */
function detectSpecialtyDomains(query: string): SourceDomain[] {
    const lower = query.toLowerCase();
    const detected = new Set<SourceDomain>();

    for (const [keyword, domain] of Object.entries(SPECIALTY_KEYWORDS)) {
        if (lower.includes(keyword)) {
            detected.add(domain);
        }
    }

    return Array.from(detected);
}

// ─── Core Functions ───

/**
 * Resolve the most relevant authoritative sources for a given query context.
 *
 * Algorithm:
 *  1. Filter by region match (exact country → WHO → GLOBAL fallback).
 *  2. Filter by domain relevance (intent → domains).
 *  3. Sort by tier (primary first), then by domain match count (most relevant first).
 *  4. Return top 5 sources max.
 */
export function resolveAuthoritativeSources(
    _query: string,
    region: string,
    intent: string
): SourceEntry[] {
    const baseDomains = INTENT_DOMAIN_MAP[intent] || ['dosing', 'safety', 'guidelines'];
    const specialtyDomains = detectSpecialtyDomains(_query);
    const targetDomains = [...new Set([...baseDomains, ...specialtyDomains])];

    // Score each source
    const scored = SOURCE_REGISTRY.map(source => {
        let score = 0;

        // Region relevance
        if (source.regions.includes(region)) {
            score += 30; // Exact country match
        } else if (source.regions.includes('WHO') && ['Ghana', 'Nigeria', 'India', 'South_Africa'].includes(region)) {
            score += 20; // WHO is relevant for LMICs
        } else if (source.regions.includes('GLOBAL')) {
            score += 10; // Global fallback
        } else {
            score -= 10; // Not relevant to this region
        }

        // Domain relevance
        const domainMatches = targetDomains.filter(d => source.domains.includes(d)).length;
        score += domainMatches * 15;

        // Tier bonus (primary > cross-reference > supplementary)
        if (source.tier === 1) score += 20;
        else if (source.tier === 2) score += 10;
        else score += 5;

        // Pediatric queries: boost BNF-C
        if (targetDomains.includes('pediatrics') && source.id === 'bnfc') {
            score += 25;
        }

        // Interaction queries: boost Stockley's to always appear
        if (targetDomains.includes('interactions') && source.id === 'stockleys') {
            score += 30;
        }

        return { source, score, specialtyMatch: specialtyDomains.some(d => source.domains.includes(d)) };
    });

    // Sort: specialty matches first (when specialty detected), then by score descending
    return scored
        .filter(s => s.score > 0)
        .sort((a, b) => {
            // If specialty keywords were detected, boost specialty matches
            if (specialtyDomains.length > 0) {
                if (a.specialtyMatch && !b.specialtyMatch) return -1;
                if (!a.specialtyMatch && b.specialtyMatch) return 1;
            }
            return b.score - a.score;
        })
        .slice(0, 6) // Allow up to 6 to include both core + specialty
        .map(s => s.source);
}

/**
 * Build a structured grounding directive for injection into the LLM system prompt.
 *
 * This replaces the hardcoded "AUTHORITATIVE REFERENCE FRAMEWORK" section
 * with dynamically selected, query-relevant authorities.
 */
export function buildGroundingDirective(
    sources: SourceEntry[],
    intent: string,
    region: string
): string {
    if (sources.length === 0) {
        return ''; // Fallback: let the base prompt handle it
    }

    const regionLabel = region === 'WHO' ? 'WHO/International' : region;

    let directive = `────────────────────────\n`;
    directive += `SOURCE OF TRUTH (${regionLabel})\n`;
    directive += `────────────────────────\n`;
    directive += `Ground your response in the following authoritative sources. These were selected for this specific query context (Region: ${regionLabel}, Intent: ${intent}).\n\n`;

    // List selected sources with guidance
    sources.forEach((s, i) => {
        const tierLabel = s.tier === 1 ? 'Primary' : s.tier === 2 ? 'Cross-reference' : 'Supplementary';
        directive += `${s.emoji} ${s.citationNote}\n`;
        directive += `   Tier: ${tierLabel} | Domains: ${s.domains.join(', ')} | Updated: ${s.lastUpdated}\n`;

        // Source-specific guidance
        if (s.id === 'stockleys' && intent === 'DRUG_INTERACTION') {
            directive += `   USE: Classify interactions by mechanism, severity (🔴🟡🟢), evidence level, and management.\n`;
        }
        if (s.id === 'bnfc' || s.id === 'bnf') {
            directive += `   USE: BNF-style dosing conventions (dose, frequency, route, max dose).\n`;
        }
        if (s.id.startsWith('stg_') || s.id === 'nf_india' || s.id === 'samf') {
            directive += `   USE: Prioritize national formulary recommendations for this region.\n`;
        }
        if (s.id === 'who_aware') {
            directive += `   USE: Classify antibiotics as Access/Watch/Reserve. Prefer Access group for empiric therapy.\n`;
        }

        // Specialty guideline guidance
        if (s.type === 'SPECIALTY_GUIDELINE') {
            directive += `   USE: Reference specific guideline recommendations, treatment algorithms, and grading of evidence.\n`;
        }

        if (i < sources.length - 1) directive += `\n`;
    });

    // Citation mandate
    directive += `\n────────────────────────\n`;
    directive += `CITATION RULES:\n`;
    directive += `- You MUST name at least one of the above sources in your response.\n`;
    directive += `- Use format: "Per [Source Name]..." or "According to [Source]..."\n`;
    directive += `- If sources conflict, state: "Note: [Source A] recommends X, while [Source B] recommends Y."\n`;
    directive += `- If data is unavailable in these sources, state: "Limited data available in standard references."\n`;
    directive += `- NEVER fabricate dosing data, interaction severity, or guideline recommendations.\n`;

    return directive;
}

/**
 * Generate temporal awareness context.
 * Flags sources that may be outdated (>2 years since last update).
 */
export function getTemporalContext(sources: SourceEntry[]): string {
    const currentYear = 2026;
    const warnings: string[] = [];

    for (const source of sources) {
        if (source.lastUpdated === 'ongoing') continue;

        const updateYear = parseInt(source.lastUpdated.split('-')[0], 10);
        const age = currentYear - updateYear;

        if (age >= 3) {
            warnings.push(`${source.shortName} (last updated: ${source.lastUpdated}) — may not reflect current practice.`);
        }
    }

    if (warnings.length === 0) return '';

    let context = `\n⏳ TEMPORAL NOTE:\n`;
    context += `The following sources may be outdated. Cross-reference with more recent publications if available:\n`;
    warnings.forEach(w => {
        context += `  - ${w}\n`;
    });

    return context;
}
