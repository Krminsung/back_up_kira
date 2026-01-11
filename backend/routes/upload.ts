import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Image upload endpoint for characters
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { file, type } = req.body;

        if (!file) {
            res.status(400).json({ error: '이미지 데이터가 없습니다.' });
            return;
        }

        // Base64 디코딩
        const matches = file.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            res.status(400).json({ error: '유효하지 않은 이미지 형식입니다.' });
            return;
        }

        const imageType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // 파일명 생성
        const filename = `${type || 'character'}_${Date.now()}.${imageType}`;
        const directory = type === 'profile' ? 'avatars' : 'characters';
        const uploadsDir = path.join('/app/uploads', directory);

        // 디렉토리 생성
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, buffer);

        const imageUrl = `/uploads/${directory}/${filename}`;

        res.json({
            success: true,
            url: imageUrl,
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: '이미지 업로드 중 오류가 발생했습니다.' });
    }
});

export default router;
