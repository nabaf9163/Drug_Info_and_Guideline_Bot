/**
 * Health Check Handler
 * 
 * Simple health check endpoint for monitoring
 */

import type { Request, Response } from 'express';
import { BOT_NAME, BOT_VERSION } from '../config/constants.js';

export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    name: string;
    version: string;
    timestamp: string;
    uptime: number;
}

/**
 * Health check endpoint handler
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
    const response: HealthCheckResponse = {
        status: 'healthy',
        name: BOT_NAME,
        version: BOT_VERSION,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    };

    res.status(200).json(response);
}
