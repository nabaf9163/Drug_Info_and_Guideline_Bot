/**
 * Ethics Guard — Layer 3 of the Source of Truth Agent
 *
 * Enforces citation discipline, scope boundaries,
 * temporal honesty, and anti-fabrication rules.
 */

import type { SourceEntry } from '../data/source-registry.js';

// ─── Scope Boundary ───

/** Topics explicitly outside MedInfo's scope */
const OUT_OF_SCOPE_PATTERNS = [
    { pattern: /\b(sue|lawsuit|legal\s+action|malpractice|litigat)/i, reason: 'legal advice' },
    { pattern: /\b(cost|price|insurance|billing|co-?pay|afford)/i, reason: 'financial/pricing information' },
    { pattern: /\b(diagnos(e|is)|what\s+(disease|condition)\s+do\s+i\s+have)/i, reason: 'clinical diagnosis' },
    { pattern: /\b(self[\s-]?medicat|should\s+i\s+take|can\s+i\s+take.*without\s+doctor)/i, reason: 'self-medication advice' },
];

/**
 * Check if a query falls outside MedInfo's clinical scope.
 * Returns a polite rejection message if so, or null if the query is in scope.
 */
export function enforceEthicalBoundary(query: string): string | null {
    for (const { pattern, reason } of OUT_OF_SCOPE_PATTERNS) {
        if (pattern.test(query)) {
            return `⚠️ This query appears to relate to ${reason}, which is outside MedInfo's scope.\n\n` +
                `MedInfo provides clinical drug information and treatment guidelines for healthcare professionals. ` +
                `For ${reason}, please consult the appropriate professional or authority.\n\n` +
                `I can help with:\n` +
                `💊 Drug information & dosing\n` +
                `🔄 Drug interactions\n` +
                `📋 Treatment guidelines\n` +
                `💬 Patient counseling points`;
        }
    }
    return null;
}

// ─── Citation Validation ───

/**
 * Check whether the LLM response cites at least one of the selected authoritative sources.
 * Returns true if at least one source name appears in the response.
 */
export function validateCitationPresence(
    response: string,
    selectedSources: SourceEntry[]
): boolean {
    const lowerResponse = response.toLowerCase();
    return selectedSources.some(source =>
        lowerResponse.includes(source.shortName.toLowerCase()) ||
        lowerResponse.includes(source.name.toLowerCase())
    );
}

/**
 * Generate a citation footer to append if the LLM failed to cite any source.
 */
export function buildCitationFooter(selectedSources: SourceEntry[]): string {
    const topSources = selectedSources.slice(0, 3);
    const citations = topSources.map(s => `${s.emoji} ${s.citationNote}`).join('\n');

    return `\n\n📚 References:\n${citations}`;
}

// ─── Temporal Honesty ───

/**
 * Append a temporal warning if any cited source is older than the threshold.
 * Returns the warning string to append, or empty string if all sources are current.
 */
export function appendTemporalWarning(
    response: string,
    sources: SourceEntry[],
    thresholdYears: number = 3
): string {
    const currentYear = 2026;
    const outdated = sources.filter(s => {
        if (s.lastUpdated === 'ongoing') return false;
        const year = parseInt(s.lastUpdated.split('-')[0], 10);
        return (currentYear - year) >= thresholdYears;
    });

    if (outdated.length === 0) return response;

    const names = outdated.map(s => `${s.shortName} (${s.lastUpdated})`).join(', ');
    return response + `\n\n⏳ Note: Some referenced guidelines (${names}) may have been updated since their last indexed edition. Verify with the latest published version.`;
}

// ─── Anti-Fabrication Rule ───

/**
 * Returns the anti-fabrication directive to be included in the system prompt.
 * This is a hard rule that the LLM must follow.
 */
export function getAntiFabricationDirective(): string {
    return `
────────────────────────
ETHICAL GUARDRAILS
────────────────────────
1. NEVER fabricate dosing values, interaction data, or guideline recommendations.
2. If information is not available in your training data or referenced sources, state: "Specific data not available in standard references. Consult the latest edition of [relevant source]."
3. If sources conflict, present both viewpoints with attribution.
4. Always differentiate between established evidence and expert opinion.
5. Do NOT provide diagnosis. You provide drug information and guideline references only.
6. ALWAYS include the verification footer.
`;
}
