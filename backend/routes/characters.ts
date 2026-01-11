import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../lib/db';

const router = express.Router();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key';

// Middleware to verify JWT token
const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all public characters
router.get('/public', async (req, res): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT id, name, description, profile_image as "profileImage", chat_count as "chatCount", 
                    like_count as "likeCount", created_at as "createdAt"
             FROM characters 
             WHERE visibility = 'PUBLIC' 
             ORDER BY created_at DESC 
             LIMIT 50`
        );

        res.json({ characters: result.rows });
    } catch (error) {
        console.error('Failed to fetch public characters:', error);
        res.status(500).json({ error: '캐릭터를 불러오는 중 오류가 발생했습니다.' });
    }
});

// Get user's characters
router.get('/my', authMiddleware, async (req: any, res): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT id, name, description, profile_image as "profileImage", visibility, 
                    chat_count as "chatCount", like_count as "likeCount", created_at as "createdAt"
             FROM characters 
             WHERE creator_id = $1 
             ORDER BY created_at DESC`,
            [req.userId]
        );

        res.json({ characters: result.rows });
    } catch (error) {
        console.error('Failed to fetch my characters:', error);
        res.status(500).json({ error: '캐릭터를 불러오는 중 오류가 발생했습니다.' });
    }
});

// Get single character
router.get('/:id', async (req, res): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT c.*, u.id as creator_id, u.name as creator_name, u.email as creator_email
             FROM characters c
             INNER JOIN users u ON c.creator_id = u.id
             WHERE c.id = $1`,
            [req.params.id]
        );

        const character = result.rows[0];
        if (!character) {
            res.status(404).json({ error: '캐릭터를 찾을 수 없습니다.' });
            return;
        }

        // Format nested creator object and camelCase fields
        const formattedCharacter = {
            ...character,
            profileImage: character.profile_image,
            chatCount: character.chat_count || 0,
            likeCount: character.like_count || 0,
            createdAt: character.created_at,
            creator: {
                id: character.creator_id,
                name: character.creator_name,
                email: character.creator_email,
            }
        };

        res.json({ character: formattedCharacter });
    } catch (error) {
        console.error('Failed to fetch character:', error);
        res.status(500).json({ error: '캐릭터를 불러오는 중 오류가 발생했습니다.' });
    }
});

// Create character
router.post('/', authMiddleware, async (req: any, res): Promise<void> => {
    try {
        const {
            name,
            description,
            personality,
            greeting,
            greetings,
            secret,
            exampleDialogs,
            visibility,
            profileImage,
            albumImages,
            worldviewId,
        } = req.body;

        if (!name || !description || !greeting) {
            res.status(400).json({ error: '필수 항목을 모두 입력해주세요.' });
            return;
        }

        // Check character limit (max 5)
        const countResult = await pool.query(
            'SELECT COUNT(*) as count FROM characters WHERE creator_id = $1',
            [req.userId]
        );

        const characterCount = parseInt(countResult.rows[0].count);

        if (characterCount >= 5) {
            res.status(400).json({
                error: 'Character limit exceeded',
                message: '최대 5개까지만 캐릭터를 만들 수 있습니다.',
            });
            return;
        }

        const result = await pool.query(
            `INSERT INTO characters (
                name, description, personality, greeting, greetings, secret,
                example_dialogs, visibility, profile_image, album_images,
                creator_id, worldview_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                name,
                description,
                personality || null,
                greeting,
                greetings ? JSON.stringify(greetings) : null,
                secret || null,
                exampleDialogs ? JSON.stringify(exampleDialogs) : null,
                visibility || 'PRIVATE',
                profileImage || null,
                albumImages ? JSON.stringify(albumImages) : null,
                req.userId,
                worldviewId || null,
            ]
        );

        res.status(201).json({ character: result.rows[0] });
    } catch (error) {
        console.error('Failed to create character:', error);
        res.status(500).json({ error: '캐릭터 생성 중 오류가 발생했습니다.' });
    }
});

// Update character
router.put('/:id', authMiddleware, async (req: any, res): Promise<void> => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            personality,
            greeting,
            greetings,
            secret,
            exampleDialogs,
            visibility,
            profileImage,
            albumImages,
            worldviewId,
        } = req.body;

        // Check ownership
        const ownerResult = await pool.query(
            'SELECT creator_id FROM characters WHERE id = $1',
            [id]
        );

        if (ownerResult.rows.length === 0) {
            res.status(404).json({ error: '캐릭터를 찾을 수 없습니다.' });
            return;
        }

        if (ownerResult.rows[0].creator_id !== req.userId) {
            res.status(403).json({ error: '권한이 없습니다.' });
            return;
        }

        const result = await pool.query(
            `UPDATE characters SET
                name = $1, description = $2, personality = $3, greeting = $4,
                greetings = $5, secret = $6, example_dialogs = $7, visibility = $8,
                profile_image = $9, album_images = $10, worldview_id = $11
            WHERE id = $12
            RETURNING *`,
            [
                name,
                description,
                personality || null,
                greeting,
                greetings ? JSON.stringify(greetings) : null,
                secret || null,
                exampleDialogs ? JSON.stringify(exampleDialogs) : null,
                visibility || 'PRIVATE',
                profileImage || null,
                albumImages ? JSON.stringify(albumImages) : null,
                worldviewId || null,
                id,
            ]
        );

        res.json({ character: result.rows[0] });
    } catch (error) {
        console.error('Failed to update character:', error);
        res.status(500).json({ error: '캐릭터 수정 중 오류가 발생했습니다.' });
    }
});

// Delete character
router.delete('/:id', authMiddleware, async (req: any, res): Promise<void> => {
    try {
        const { id } = req.params;

        // Check ownership
        const ownerResult = await pool.query(
            'SELECT creator_id FROM characters WHERE id = $1',
            [id]
        );

        if (ownerResult.rows.length === 0) {
            res.status(404).json({ error: '캐릭터를 찾을 수 없습니다.' });
            return;
        }

        if (ownerResult.rows[0].creator_id !== req.userId) {
            res.status(403).json({ error: '권한이 없습니다.' });
            return;
        }

        await pool.query('DELETE FROM characters WHERE id = $1', [id]);

        res.json({ success: true, message: '캐릭터가 삭제되었습니다.' });
    } catch (error) {
        console.error('Failed to delete character:', error);
        res.status(500).json({ error: '캐릭터 삭제 중 오류가 발생했습니다.' });
    }
});

export default router;
