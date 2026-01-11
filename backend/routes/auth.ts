import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pool from '../lib/db';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key';

// 이메일/비밀번호 회원가입
router.post('/register', async (req, res): Promise<void> => {
    try {
        const { name, email, password } = req.body;

        // 이메일 중복 확인
        const existingUserResult = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUserResult.rows.length > 0) {
            res.status(400).json({ error: '이미 가입된 이메일입니다.' });
            return;
        }

        // 비밀번호 해시화
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        const result = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: '회원가입이 완료되었습니다.', userId: result.rows[0].id });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
    }
});

// 이메일/비밀번호 로그인
router.post('/login', async (req, res): Promise<void> => {
    try {
        const { email, password } = req.body;

        // 사용자 찾기
        const result = await pool.query(
            'SELECT id, email, name, password FROM users WHERE email = $1',
            [email]
        );

        const user = result.rows[0];
        if (!user || !user.password) {
            res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
            return;
        }

        // 비밀번호 확인
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
            return;
        }

        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Cookie 설정
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
        });

        res.json({ message: '로그인 성공', user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
    }
});

router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/' }),
    (req, res): void => {
        const user = req.user as any;
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        const frontendUrl = process.env.FRONTEND_URL || '/';
        res.redirect(frontendUrl);
    }
);

router.get('/me', async (req, res): Promise<any> => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;

        // 데이터베이스에서 사용자 정보 조회
        const result = await pool.query(
            'SELECT id, email, name, name_changed as "nameChanged", avatar FROM users WHERE id = $1',
            [userId]
        );

        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                userId: user.id,
                email: user.email,
                name: user.name,
                nameChanged: user.nameChanged,
                avatar: user.avatar,
            },
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// 회원탈퇴
router.delete('/account', async (req, res): Promise<void> => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;

        // 사용자 삭제 (CASCADE로 관련 데이터 자동 삭제)
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        res.clearCookie('token');
        res.json({ success: true, message: '회원탈퇴가 완료되었습니다.' });
    } catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({ error: '회원탈퇴 중 오류가 발생했습니다.' });
    }
});

// 이름 변경 (1회 한정)
router.patch('/name', async (req, res): Promise<void> => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;
        const { name } = req.body;

        if (!name || name.trim().length === 0) {
            res.status(400).json({ error: '이름을 입력해주세요.' });
            return;
        }

        // 현재 사용자 조회
        const userResult = await pool.query(
            'SELECT name_changed FROM users WHERE id = $1',
            [userId]
        );

        const user = userResult.rows[0];
        if (!user) {
            res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
            return;
        }

        // 이미 이름을 변경했는지 확인
        if (user.name_changed) {
            res.status(403).json({ error: '이름은 1회만 변경 가능합니다.' });
            return;
        }

        // 이름 변경
        const updateResult = await pool.query(
            'UPDATE users SET name = $1, name_changed = true WHERE id = $2 RETURNING id, name, email, name_changed as "nameChanged"',
            [name.trim(), userId]
        );

        const updatedUser = updateResult.rows[0];

        res.json({
            success: true,
            message: '이름이 변경되었습니다.',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                nameChanged: updatedUser.nameChanged,
            },
        });
    } catch (error) {
        console.error('Name change error:', error);
        res.status(500).json({ error: '이름 변경 중 오류가 발생했습니다.' });
    }
});

// 프로필 사진 업로드
router.post('/avatar', async (req, res): Promise<void> => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded.userId;
        const { imageData } = req.body;

        if (!imageData) {
            res.status(400).json({ error: '이미지 데이터가 없습니다.' });
            return;
        }

        // Base64 디코딩
        const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            res.status(400).json({ error: '유효하지 않은 이미지 형식입니다.' });
            return;
        }

        const imageType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // 파일명 생성
        const filename = `avatar_${userId}_${Date.now()}.${imageType}`;
        const uploadsDir = path.join(__dirname, '../../uploads/avatars');

        // 디렉토리 생성
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, buffer);

        const avatarUrl = `/uploads/avatars/${filename}`;

        // 프로필 사진 업데이트
        const result = await pool.query(
            'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING avatar',
            [avatarUrl, userId]
        );

        res.json({
            success: true,
            message: '프로필 사진이 변경되었습니다.',
            avatar: result.rows[0].avatar,
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: '프로필 사진 업로드 중 오류가 발생했습니다.' });
    }
});

export default router;
