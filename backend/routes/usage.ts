import { Router, Request, Response } from 'express';
import pool from '../lib/db';
import { getKSTTodayStart } from '../utils/date';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const LIMITS = {
    'gemini-2.5-flash': 300,
    'gemini-3-flash': 30,
};

router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user!.id;
        const todayCommon = getKSTTodayStart();

        // Group count by model
        const result = await pool.query(
            `SELECT model, COUNT(*) as count 
             FROM api_usage 
             WHERE user_id = $1 AND used_at >= $2 
             GROUP BY model`,
            [userId, todayCommon]
        );

        const usageMap: Record<string, { used: number; limit: number; remaining: number }> = {};

        // Initialize defaults
        Object.keys(LIMITS).forEach((model) => {
            usageMap[model] = {
                used: 0,
                limit: LIMITS[model as keyof typeof LIMITS],
                remaining: LIMITS[model as keyof typeof LIMITS],
            };
        });

        // Fill with actual data
        result.rows.forEach((row) => {
            const model = row.model;
            const count = parseInt(row.count);
            if (usageMap[model]) {
                usageMap[model].used = count;
                usageMap[model].remaining = Math.max(0, usageMap[model].limit - count);
            }
        });

        res.json({ usage: usageMap });
    } catch (error) {
        console.error('Usage API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
