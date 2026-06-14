/**
 * Source Registry — Layer 1 of the Source of Truth Agent
 *
 * Typed database of all recognized drug information manuals
 * and treatment guidelines that MedInfo is grounded in.
 */

// ─── Types ───

export type SourceType = 'FORMULARY' | 'GUIDELINE' | 'SPECIALTY_GUIDELINE' | 'INTERACTION_DB' | 'SAFETY_DB';

export type SourceDomain =
    | 'dosing'
    | 'interactions'
    | 'safety'
    | 'counseling'
    | 'guidelines'
    | 'antimicrobials'
    | 'pediatrics'
    | 'pharmacokinetics'
    | 'off-label'
    // Specialty domains
    | 'cardiology'
    | 'obstetrics'
    | 'respiratory'
    | 'nephrology'
    | 'rheumatology'
    | 'endocrinology'
    | 'hepatology'
    | 'oncology'
    | 'neurology'
    | 'psychiatry';

export interface SourceEntry {
    id: string;
    name: string;
    shortName: string;
    emoji: string;
    type: SourceType;
    regions: string[];          // Country codes or 'GLOBAL'
    domains: SourceDomain[];
    lastUpdated: string;        // YYYY-MM or "ongoing"
    tier: 1 | 2 | 3;           // 1 = primary, 2 = cross-reference, 3 = supplementary
    citationNote: string;       // How to reference in output
}

// ─── Registry ───

export const SOURCE_REGISTRY: SourceEntry[] = [

    // ═══════════════════════════════════
    // TIER 1 — Primary Authoritative Sources
    // ═══════════════════════════════════

    {
        id: 'bnf',
        name: 'British National Formulary',
        shortName: 'BNF',
        emoji: '📘',
        type: 'FORMULARY',
        regions: ['UK', 'WHO', 'GLOBAL'],
        domains: ['dosing', 'safety', 'counseling', 'pharmacokinetics'],
        lastUpdated: '2025-09',
        tier: 1,
        citationNote: 'BNF (British National Formulary)',
    },
    {
        id: 'bnfc',
        name: 'BNF for Children',
        shortName: 'BNF-C',
        emoji: '📘',
        type: 'FORMULARY',
        regions: ['UK', 'WHO', 'GLOBAL'],
        domains: ['dosing', 'pediatrics', 'safety'],
        lastUpdated: '2025-09',
        tier: 1,
        citationNote: 'BNF for Children (BNF-C)',
    },
    {
        id: 'martindale',
        name: 'Martindale: The Complete Drug Reference',
        shortName: 'Martindale',
        emoji: '📕',
        type: 'FORMULARY',
        regions: ['GLOBAL'],
        domains: ['dosing', 'off-label', 'pharmacokinetics', 'safety'],
        lastUpdated: '2024-06',
        tier: 1,
        citationNote: 'Martindale: The Complete Drug Reference',
    },
    {
        id: 'ahfs',
        name: 'AHFS Drug Information',
        shortName: 'AHFS-DI',
        emoji: '📙',
        type: 'FORMULARY',
        regions: ['USA', 'GLOBAL'],
        domains: ['dosing', 'off-label', 'safety', 'pharmacokinetics'],
        lastUpdated: '2025-01',
        tier: 1,
        citationNote: 'AHFS Drug Information (American Society of Health-System Pharmacists)',
    },
    {
        id: 'stockleys',
        name: "Stockley's Drug Interactions",
        shortName: "Stockley's",
        emoji: '📒',
        type: 'INTERACTION_DB',
        regions: ['GLOBAL'],
        domains: ['interactions'],
        lastUpdated: '2025-03',
        tier: 1,
        citationNote: "Stockley's Drug Interactions",
    },
    {
        id: 'who_eml',
        name: 'WHO Model List of Essential Medicines',
        shortName: 'WHO EML',
        emoji: '🌍',
        type: 'GUIDELINE',
        regions: ['WHO', 'GLOBAL', 'Ghana', 'Nigeria', 'India', 'South_Africa'],
        domains: ['guidelines', 'dosing', 'antimicrobials'],
        lastUpdated: '2023-10',
        tier: 1,
        citationNote: 'WHO Model List of Essential Medicines (23rd List, 2023)',
    },
    {
        id: 'who_aware',
        name: 'WHO AWaRe Classification of Antibiotics',
        shortName: 'WHO AWaRe',
        emoji: '🦠',
        type: 'GUIDELINE',
        regions: ['GLOBAL'],
        domains: ['antimicrobials', 'guidelines'],
        lastUpdated: '2023-10',
        tier: 1,
        citationNote: 'WHO AWaRe Classification (2023)',
    },
    {
        id: 'nice',
        name: 'NICE Clinical Guidelines',
        shortName: 'NICE',
        emoji: '🏛️',
        type: 'GUIDELINE',
        regions: ['UK'],
        domains: ['guidelines', 'antimicrobials', 'safety'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'NICE (National Institute for Health and Care Excellence)',
    },
    {
        id: 'idsa',
        name: 'IDSA Practice Guidelines',
        shortName: 'IDSA',
        emoji: '🏛️',
        type: 'GUIDELINE',
        regions: ['USA'],
        domains: ['guidelines', 'antimicrobials'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'IDSA (Infectious Diseases Society of America)',
    },

    // ═══════════════════════════════════
    // TIER 1 — National STGs (LMICs)
    // ═══════════════════════════════════

    {
        id: 'stg_ghana',
        name: 'Ghana Standard Treatment Guidelines',
        shortName: 'Ghana STG',
        emoji: '🇬🇭',
        type: 'GUIDELINE',
        regions: ['Ghana'],
        domains: ['guidelines', 'dosing', 'antimicrobials'],
        lastUpdated: '2022-01',
        tier: 1,
        citationNote: 'Ghana Standard Treatment Guidelines (Ministry of Health)',
    },
    {
        id: 'stg_nigeria',
        name: 'Nigeria Standard Treatment Guidelines',
        shortName: 'Nigeria STG',
        emoji: '🇳🇬',
        type: 'GUIDELINE',
        regions: ['Nigeria'],
        domains: ['guidelines', 'dosing', 'antimicrobials'],
        lastUpdated: '2021-01',
        tier: 1,
        citationNote: 'Nigeria Standard Treatment Guidelines (FMOH)',
    },
    {
        id: 'nf_india',
        name: 'National Formulary of India',
        shortName: 'NFI',
        emoji: '🇮🇳',
        type: 'FORMULARY',
        regions: ['India'],
        domains: ['dosing', 'guidelines', 'safety'],
        lastUpdated: '2021-01',
        tier: 1,
        citationNote: 'National Formulary of India (Indian Pharmacopoeia Commission)',
    },
    {
        id: 'samf',
        name: 'South African Medicines Formulary',
        shortName: 'SAMF',
        emoji: '🇿🇦',
        type: 'FORMULARY',
        regions: ['South_Africa'],
        domains: ['dosing', 'guidelines', 'safety'],
        lastUpdated: '2022-01',
        tier: 1,
        citationNote: 'South African Medicines Formulary (SAMF)',
    },

    // ═══════════════════════════════════
    // TIER 2 — Cross-References
    // ═══════════════════════════════════

    {
        id: 'emc',
        name: 'Electronic Medicines Compendium (SmPCs)',
        shortName: 'eMC',
        emoji: '📗',
        type: 'FORMULARY',
        regions: ['UK', 'GLOBAL'],
        domains: ['dosing', 'counseling', 'safety', 'pharmacokinetics'],
        lastUpdated: 'ongoing',
        tier: 2,
        citationNote: 'eMC / Summary of Product Characteristics (SmPC)',
    },
    {
        id: 'lexicomp',
        name: 'Lexicomp / UpToDate',
        shortName: 'Lexicomp',
        emoji: '📚',
        type: 'FORMULARY',
        regions: ['USA', 'GLOBAL'],
        domains: ['dosing', 'safety', 'off-label', 'pediatrics'],
        lastUpdated: 'ongoing',
        tier: 2,
        citationNote: 'Lexicomp (Wolters Kluwer)',
    },
    {
        id: 'micromedex',
        name: 'IBM Micromedex',
        shortName: 'Micromedex',
        emoji: '📚',
        type: 'FORMULARY',
        regions: ['GLOBAL'],
        domains: ['dosing', 'interactions', 'safety'],
        lastUpdated: 'ongoing',
        tier: 2,
        citationNote: 'Micromedex (IBM/Merative)',
    },
    {
        id: 'who_model_prescribing',
        name: 'WHO Guide to Good Prescribing',
        shortName: 'WHO Prescribing',
        emoji: '🌍',
        type: 'GUIDELINE',
        regions: ['WHO', 'GLOBAL'],
        domains: ['guidelines', 'counseling'],
        lastUpdated: '2012-01',
        tier: 2,
        citationNote: 'WHO Guide to Good Prescribing',
    },

    // ═══════════════════════════════════
    // TIER 3 — Supplementary
    // ═══════════════════════════════════

    {
        id: 'fda_labels',
        name: 'FDA Prescribing Information (US Labels)',
        shortName: 'FDA PI',
        emoji: '🇺🇸',
        type: 'SAFETY_DB',
        regions: ['USA'],
        domains: ['safety', 'dosing'],
        lastUpdated: 'ongoing',
        tier: 3,
        citationNote: 'FDA Prescribing Information',
    },
    {
        id: 'mhra',
        name: 'MHRA Drug Safety Updates',
        shortName: 'MHRA',
        emoji: '🇬🇧',
        type: 'SAFETY_DB',
        regions: ['UK'],
        domains: ['safety'],
        lastUpdated: 'ongoing',
        tier: 3,
        citationNote: 'MHRA Drug Safety Update',
    },

    // ═══════════════════════════════════
    // TIER 1 — Specialty & Association Guidelines
    // ═══════════════════════════════════

    {
        id: 'aha_acc',
        name: 'AHA/ACC Clinical Practice Guidelines',
        shortName: 'AHA/ACC',
        emoji: '❤️',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['USA', 'GLOBAL'],
        domains: ['cardiology', 'guidelines', 'dosing'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'AHA/ACC (American Heart Association / American College of Cardiology)',
    },
    {
        id: 'esc',
        name: 'European Society of Cardiology Guidelines',
        shortName: 'ESC',
        emoji: '❤️',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['UK', 'GLOBAL'],
        domains: ['cardiology', 'guidelines', 'dosing'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'ESC (European Society of Cardiology)',
    },
    {
        id: 'acog',
        name: 'ACOG Practice Bulletins',
        shortName: 'ACOG',
        emoji: '🤰',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['USA', 'GLOBAL'],
        domains: ['obstetrics', 'guidelines', 'safety', 'dosing'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'ACOG (American College of Obstetricians and Gynecologists)',
    },
    {
        id: 'gina',
        name: 'GINA Global Strategy for Asthma Management',
        shortName: 'GINA',
        emoji: '🫁',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['GLOBAL'],
        domains: ['respiratory', 'guidelines', 'dosing'],
        lastUpdated: '2024-01',
        tier: 1,
        citationNote: 'GINA (Global Initiative for Asthma, 2024)',
    },
    {
        id: 'gold',
        name: 'GOLD Report for COPD',
        shortName: 'GOLD',
        emoji: '🫁',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['GLOBAL'],
        domains: ['respiratory', 'guidelines', 'dosing'],
        lastUpdated: '2024-01',
        tier: 1,
        citationNote: 'GOLD (Global Initiative for Chronic Obstructive Lung Disease, 2024)',
    },
    {
        id: 'kdigo',
        name: 'KDIGO Clinical Practice Guidelines',
        shortName: 'KDIGO',
        emoji: '🫘',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['GLOBAL'],
        domains: ['nephrology', 'guidelines', 'dosing'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'KDIGO (Kidney Disease: Improving Global Outcomes)',
    },
    {
        id: 'acr',
        name: 'ACR Guidelines for Rheumatic Diseases',
        shortName: 'ACR',
        emoji: '🦴',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['USA', 'GLOBAL'],
        domains: ['rheumatology', 'guidelines', 'dosing', 'safety'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'ACR (American College of Rheumatology)',
    },
    {
        id: 'ada',
        name: 'ADA Standards of Care in Diabetes',
        shortName: 'ADA',
        emoji: '🩸',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['USA', 'GLOBAL'],
        domains: ['endocrinology', 'guidelines', 'dosing'],
        lastUpdated: '2025-01',
        tier: 1,
        citationNote: 'ADA (American Diabetes Association, Standards of Care 2025)',
    },
    {
        id: 'easl',
        name: 'EASL Clinical Practice Guidelines',
        shortName: 'EASL',
        emoji: '🫀',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['GLOBAL'],
        domains: ['hepatology', 'guidelines', 'dosing'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'EASL (European Association for the Study of the Liver)',
    },
    {
        id: 'aasld',
        name: 'AASLD Practice Guidelines for Liver Diseases',
        shortName: 'AASLD',
        emoji: '🫀',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['USA', 'GLOBAL'],
        domains: ['hepatology', 'guidelines', 'dosing'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'AASLD (American Association for the Study of Liver Diseases)',
    },
    {
        id: 'ats',
        name: 'ATS/IDSA Guidelines for Pneumonia & TB',
        shortName: 'ATS',
        emoji: '🫁',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['USA', 'GLOBAL'],
        domains: ['respiratory', 'antimicrobials', 'guidelines'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'ATS (American Thoracic Society)',
    },
    {
        id: 'escmid',
        name: 'ESCMID Guidelines for Infectious Diseases',
        shortName: 'ESCMID',
        emoji: '🦠',
        type: 'SPECIALTY_GUIDELINE',
        regions: ['GLOBAL'],
        domains: ['antimicrobials', 'guidelines'],
        lastUpdated: 'ongoing',
        tier: 1,
        citationNote: 'ESCMID (European Society of Clinical Microbiology and Infectious Diseases)',
    },
];

// ─── Lookup Helpers ───

/**
 * Get all sources matching a region. Falls back to GLOBAL sources.
 */
export function getSourcesByRegion(region: string): SourceEntry[] {
    const direct = SOURCE_REGISTRY.filter(s =>
        s.regions.includes(region) || s.regions.includes('GLOBAL')
    );
    return direct.sort((a, b) => a.tier - b.tier);
}

/**
 * Get all sources covering a specific domain.
 */
export function getSourcesByDomain(domain: SourceDomain): SourceEntry[] {
    return SOURCE_REGISTRY.filter(s => s.domains.includes(domain))
        .sort((a, b) => a.tier - b.tier);
}

/**
 * Get a source by its ID.
 */
export function getSourceById(id: string): SourceEntry | undefined {
    return SOURCE_REGISTRY.find(s => s.id === id);
}
