import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../config/constants.js';

interface AnalyticsData {
    period: string; // e.g., "Last 24 Hours"
    totalQueries: number;
    platformBreakdown: Record<string, number>;
    avgLatencyMs: number;
    modelUsage: Record<string, number>;
    intentBreakdown: Record<string, number>;
    validationPassRate: number;
    feedbackScore: number; // Percentage positive
    topRegion: string;
}

export const analyticsService = {
    /**
     * Get live stats for the specified number of days (defaults to 1 day)
     * For MVP: Fetches recent logs and aggregates in-memory.
     * limitation: Caps at 500 recent logs to prevent performance issues.
     */
    async getStats(days: number = 1): Promise<AnalyticsData> {
        const db = getFirestore();
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const timestamp = Timestamp.fromDate(startDate);

        try {
            // 1. Fetch Query Logs
            const querySnapshot = await db.collection(COLLECTIONS.QUERY_LOGS)
                .where('timestamp', '>=', timestamp)
                .orderBy('timestamp', 'desc')
                .limit(500) // Safety limit
                .get();

            const totalQueries = querySnapshot.size;
            const platformBreakdown: Record<string, number> = {};
            const intentBreakdown: Record<string, number> = {};
            const modelUsage: Record<string, number> = {};
            const regionCounts: Record<string, number> = {};
            let totalLatency = 0;

            querySnapshot.docs.forEach(doc => {
                const data = doc.data();

                // Platform
                const platform = data.platform || 'unknown';
                platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;

                // Intent
                const intent = data.intent || 'UNKNOWN';
                intentBreakdown[intent] = (intentBreakdown[intent] || 0) + 1;

                // Model
                const model = data.modelUsed || 'default';
                modelUsage[model] = (modelUsage[model] || 0) + 1;

                // Region
                const region = data.country || 'unknown';
                regionCounts[region] = (regionCounts[region] || 0) + 1;

                // Latency
                if (data.latencyMs) {
                    totalLatency += data.latencyMs;
                }
            });

            const avgLatencyMs = totalQueries > 0 ? Math.round(totalLatency / totalQueries) : 0;

            // Find top region
            const topRegion = Object.entries(regionCounts)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

            // 2. Fetch Feedback Logs (for approval rate)
            const feedbackSnapshot = await db.collection(COLLECTIONS.FEEDBACK_LOGS)
                .where('timestamp', '>=', timestamp)
                .limit(100)
                .get();

            let positiveFeedback = 0;
            let totalFeedback = 0;

            feedbackSnapshot.docs.forEach(doc => {
                const data = doc.data();
                totalFeedback++;
                if (data.rating === 'positive') {
                    positiveFeedback++;
                }
            });

            const feedbackScore = totalFeedback > 0
                ? Math.round((positiveFeedback / totalFeedback) * 100)
                : 0;

            // 3. Fetch Validation Logs (pass rate)
            const validationSnapshot = await db.collection(COLLECTIONS.VALIDATION_LOGS)
                .where('timestamp', '>=', timestamp)
                .limit(100)
                .get();

            let passedValidation = 0;
            validationSnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.validationPassed) {
                    passedValidation++;
                }
            });

            const validationPassRate = validationSnapshot.size > 0
                ? Math.round((passedValidation / validationSnapshot.size) * 100)
                : 0;

            return {
                period: days === 1 ? 'Last 24 Hours' : `Last ${days} Days`,
                totalQueries,
                platformBreakdown,
                avgLatencyMs,
                modelUsage,
                intentBreakdown,
                validationPassRate,
                feedbackScore,
                topRegion
            };

        } catch (error) {
            console.error('[analyticsService] Failed to fetch stats:', error);
            // Return empty stats on error
            return {
                period: 'Error',
                totalQueries: 0,
                platformBreakdown: {},
                avgLatencyMs: 0,
                modelUsage: {},
                intentBreakdown: {},
                validationPassRate: 0,
                feedbackScore: 0,
                topRegion: 'N/A'
            };
        }
    }
};
