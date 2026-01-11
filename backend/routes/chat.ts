import { Router, Request, Response } from 'express';
import pool from '../lib/db';
import { generateCharacterResponseStream, generateImagePrompt, generateImage } from '../lib/gemini';
import { getKSTTodayStart } from '../utils/date';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const router = Router();

// Define daily limits
const LIMITS = {
    'gemini-2.5-flash': 300,
    'gemini-3-flash': 30,
};

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    let { message, history, characterId, model, conversationId } = req.body;
    const userId = (req as AuthRequest).user!.id;
    const selectedModel = (model === 'gemini-3-flash') ? 'gemini-3-flash' : 'gemini-2.5-flash';
    const dailyLimit = LIMITS[selectedModel];

    try {
        // 1. Check Daily Usage (KST)
        const todayCommon = getKSTTodayStart();

        const usageResult = await pool.query(
            'SELECT COUNT(*) as count FROM api_usage WHERE user_id = $1 AND model = $2 AND used_at >= $3',
            [userId, selectedModel, todayCommon]
        );

        const usageCount = parseInt(usageResult.rows[0].count);

        if (usageCount >= dailyLimit) {
            res.status(429).json({
                error: 'Daily limit exceeded',
                usageLimitExceeded: true,
                message: `일일 사용량을 초과했습니다. (${selectedModel}: ${dailyLimit}회)`,
            });
            return;
        }

        // 2. Fetch Character
        const charResult = await pool.query(
            'SELECT * FROM characters WHERE id = $1',
            [characterId]
        );

        const character = charResult.rows[0];
        if (!character) {
            res.status(404).json({ error: 'Character not found' });
            return;
        }

        // 3. Ensure Conversation Exists (BEFORE streaming)
        console.log(`[Conversation] Received conversationId: ${conversationId}, characterId: ${characterId}, userId: ${userId}`);

        if (!conversationId) {
            // Always create a new conversation when starting a chat
            console.log(`[Conversation] Creating new conversation`);

            // Check conversation limit (max 10)
            const countResult = await pool.query(
                'SELECT COUNT(*) as count FROM conversations WHERE user_id = $1',
                [userId]
            );

            const conversationCount = parseInt(countResult.rows[0].count);

            if (conversationCount >= 10) {
                res.status(400).json({
                    error: 'Conversation limit exceeded',
                    message: '최대 10개까지만 대화를 생성할 수 있습니다.',
                });
                return;
            }

            // Create new conversation
            const convResult = await pool.query(
                `INSERT INTO conversations (user_id, character_id, title) 
                 VALUES ($1, $2, $3) 
                 RETURNING id`,
                [userId, characterId, `${character.name}와의 대화`]
            );
            conversationId = convResult.rows[0].id;
            console.log(`[Conversation] Created new conversation: ${conversationId}`);

            // Increment character's chat_count
            await pool.query(
                'UPDATE characters SET chat_count = COALESCE(chat_count, 0) + 1 WHERE id = $1',
                [characterId]
            );
        } else {
            console.log(`[Conversation] Using existing conversationId from request: ${conversationId}`);
        }

        // 4. Setup SSE Stream
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Map to correct API model name
        const apiModelName = selectedModel === 'gemini-3-flash' ? 'gemini-3-flash-preview' : selectedModel;

        const stream = await generateCharacterResponseStream(
            character,
            history || [],
            message,
            (req as AuthRequest).user!.name || 'User',
            apiModelName
        );


        let fullResponse = "";

        for await (const chunk of stream) {
            fullResponse += chunk;
            // Send in SSE format
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }

        // Send done signal with conversationId
        res.write(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`);

        // 5. Record Usage on Success
        await pool.query(
            'INSERT INTO api_usage (user_id, model) VALUES ($1, $2)',
            [userId, selectedModel]
        );



        // 6. Save Messages
        await pool.query(
            'INSERT INTO messages (content, role, conversation_id) VALUES ($1, $2, $3)',
            [message, 'USER', conversationId]
        );

        await pool.query(
            'INSERT INTO messages (content, role, conversation_id) VALUES ($1, $2, $3)',
            [fullResponse, 'ASSISTANT', conversationId]
        );

        res.end();

    } catch (error) {
        console.error('Chat API Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.end();
        }
    }
});

router.post('/image', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthRequest).user!.id;
    const messages = req.body.messages || [];
    const characterName = req.body.characterName || 'Character';
    const conversationId = req.body.conversationId;

    console.log('Image Request Body:', req.body);

    try {
        // 1. Fetch character info from database to get description
        let characterDescription = "A character in a chat";

        if (conversationId) {
            try {
                // Get character ID from conversation
                const convResult = await pool.query(
                    'SELECT character_id FROM conversations WHERE id = $1',
                    [conversationId]
                );

                if (convResult.rows.length > 0) {
                    const characterId = convResult.rows[0].character_id;

                    // Get character description
                    const charResult = await pool.query(
                        'SELECT description FROM characters WHERE id = $1',
                        [characterId]
                    );

                    if (charResult.rows.length > 0 && charResult.rows[0].description) {
                        characterDescription = charResult.rows[0].description;
                    }
                }
            } catch (err) {
                console.error('Failed to fetch character description:', err);
            }
        }

        // 2. Generate Prompt using character description
        console.log('Using character description:', characterDescription);
        const characterObj = { name: characterName, description: characterDescription };

        const imagePrompt = await generateImagePrompt(characterObj as any, messages);

        // Enhanced style keywords for anime/manhwa art
        const styledPrompt = `masterpiece, best quality, highly detailed anime illustration, Japanese anime art style, Korean manhwa art style, beautiful anime character, soft cel shading, digital illustration, light novel cover art, otome game CG style, romance fantasy illustration, delicate linework, vibrant colors, ${characterDescription}, ${imagePrompt}`;

        // 3. Generate Image (Robust: HF with retry -> Pollinations fallback)
        const arrayBuffer = await generateImage(styledPrompt);
        const buffer = Buffer.from(arrayBuffer);

        const filename = `chat_${Date.now()}_${randomUUID().slice(0, 8)}.jpg`;
        const uploadDir = path.join(__dirname, '../../uploads/chat_images');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filepath = path.join(uploadDir, filename);
        await fs.promises.writeFile(filepath, buffer);

        const localUrl = `/uploads/chat_images/${filename}`;

        // 3. Save to Database if conversationId exists
        if (req.body.conversationId) {
            await pool.query(
                'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
                [req.body.conversationId, 'ASSISTANT', `![Scene](${localUrl})`]
            );
        }

        res.json({ imageUrl: localUrl });

    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

router.get('/:conversationId/messages', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const { conversationId } = req.params;
    const userId = (req as AuthRequest).user!.id;

    try {
        // Verify ownership
        const convResult = await pool.query(
            'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
            [conversationId, userId]
        );

        if (convResult.rows.length === 0) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const result = await pool.query(
            `SELECT id, role, content, created_at as "createdAt"
             FROM messages 
             WHERE conversation_id = $1 
             ORDER BY created_at ASC`,
            [conversationId]
        );

        res.json({ messages: result.rows });
    } catch (error) {
        console.error('Fetch messages error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
