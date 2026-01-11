import { Router, Request, Response } from 'express';
import pool from '../lib/db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all conversations for the logged-in user
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.id;

    try {
        const result = await pool.query(
            `SELECT 
                c.id, c.title, c.created_at as "createdAt", c.updated_at as "updatedAt",
                ch.id as "characterId", ch.name as "characterName", ch.profile_image as "characterProfileImage",
                COUNT(m.id) as "messageCount"
             FROM conversations c
             INNER JOIN characters ch ON c.character_id = ch.id
             LEFT JOIN messages m ON c.id = m.conversation_id
             WHERE c.user_id = $1
             GROUP BY c.id, ch.id
             ORDER BY c.updated_at DESC`,
            [userId]
        );

        // Calculate remaining time for each conversation
        const conversationsWithTime = result.rows.map(row => {
            const createdAt = new Date(row.createdAt);
            const expiresAt = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
            const remainingMs = expiresAt.getTime() - Date.now();

            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            return {
                id: row.id,
                title: row.title || `${row.characterName}와의 대화`,
                character: {
                    id: row.characterId,
                    name: row.characterName,
                    profileImage: row.characterProfileImage,
                },
                messageCount: parseInt(row.messageCount),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                remainingTime: {
                    hours: Math.max(0, hours),
                    minutes: Math.max(0, minutes),
                    expired: remainingMs <= 0,
                },
            };
        });

        res.json({ conversations: conversationsWithTime });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get conversation count for the logged-in user
router.get('/count', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.id;

    try {
        const result = await pool.query(
            'SELECT COUNT(*) as count FROM conversations WHERE user_id = $1',
            [userId]
        );

        const count = parseInt(result.rows[0].count);
        res.json({ count, limit: 10 });
    } catch (error) {
        console.error('Error counting conversations:', error);
        res.status(500).json({ error: 'Failed to count conversations' });
    }
});

// Delete a specific conversation
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = (req as AuthRequest).user!.id;

    try {
        // Verify ownership
        const result = await pool.query(
            'SELECT user_id FROM conversations WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        if (result.rows[0].user_id !== userId) {
            res.status(403).json({ error: 'Unauthorized' });
            return;
        }

        // Delete conversation (messages will cascade)
        await pool.query('DELETE FROM conversations WHERE id = $1', [id]);

        res.json({ success: true, message: 'Conversation deleted' });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

// Delete expired conversations (to be called by cron job or manually)
router.delete('/cleanup/expired', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    try {
        const result = await pool.query(
            'DELETE FROM conversations WHERE created_at < $1',
            [threeDaysAgo]
        );

        res.json({ success: true, deleted: result.rowCount || 0 });
    } catch (error) {
        console.error('Error cleaning up conversations:', error);
        res.status(500).json({ error: 'Failed to cleanup conversations' });
    }
});

export default router;
