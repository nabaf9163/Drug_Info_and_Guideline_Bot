/**
 * Extraction Service
 * 
 * Logic to extract structured entities (age, weight, etc.) from natural language text.
 */

export interface PatientParams {
    age?: string;
    weight?: string;
    renalFunction?: string;
    isPediatric?: boolean;
}

/**
 * Extract patient parameters from a message string
 */
export function extractPatientParams(text: string): PatientParams {
    const params: PatientParams = {};
    const lowerText = text.toLowerCase();

    // 1. Extract Age
    // Patterns: "3yr", "3 years old", "3yo", "3 months", "3m"
    const ageRegex = /(\d+(?:\.\d+)?)\s*(years?|yrs?|yo|months?|mths?|mo|weeks?|wks?|days?)(?:\s*old)?/i;
    const ageMatch = text.match(ageRegex);

    if (ageMatch) {
        params.age = formatAge(ageMatch[1], ageMatch[2]);
        params.isPediatric = isPediatricAge(ageMatch[1], ageMatch[2]);
    } else {
        // Check for keywords if no specific age found
        if (/(child|kid|pediatric|paediatric)/i.test(lowerText)) {
            params.age = 'child'; // Generic
            params.isPediatric = true;
        } else if (/(infant|baby)/i.test(lowerText)) {
            params.age = 'infant';
            params.isPediatric = true;
        } else if (/(neonate|newborn)/i.test(lowerText)) {
            params.age = 'neonate';
            params.isPediatric = true;
        }
    }

    // 2. Extract Weight
    // Patterns: "10kg", "10.5 kg", "1000g"
    const weightRegex = /(\d+(?:\.\d+)?)\s*(kg|g|lbs?)/i;
    const weightMatch = text.match(weightRegex);

    if (weightMatch) {
        params.weight = `${weightMatch[1]}${weightMatch[2].toLowerCase()}`;
    }

    // 3. Extract Renal Function (Simple)
    // Patterns: "CrCl 30", "eGFR 60"
    const renalRegex = /(?:crcl|egfr|gfr)\s*(?:=|is)?\s*(\d+(?:\.\d+)?)/i;
    const renalMatch = text.match(renalRegex);

    if (renalMatch) {
        params.renalFunction = renalMatch[1];
    }

    return params;
}

/**
 * Normalize age string (e.g. "3 yrs" -> "3 years")
 */
function formatAge(value: string, unit: string): string {
    const u = unit.toLowerCase();
    if (u.startsWith('y')) return `${value} years`;
    if (u.startsWith('m')) return `${value} months`;
    if (u.startsWith('w')) return `${value} weeks`;
    if (u.startsWith('d')) return `${value} days`;
    return `${value} ${unit}`;
}

/**
 * Determine if age implies pediatric (< 18 years)
 */
function isPediatricAge(value: string, unit: string): boolean {
    const num = parseFloat(value);
    const u = unit.toLowerCase();

    if (u.startsWith('y')) return num < 18;
    // Months, weeks, days are always pediatric
    return true;
}
