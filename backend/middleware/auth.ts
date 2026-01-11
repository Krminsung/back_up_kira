import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email?: string;
        name?: string;
    };
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies['token'];

        if (!token) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            (req as AuthRequest).user = {
                id: decoded.userId,
                email: decoded.email,
                name: decoded.name || 'User', // JWT payload에 name이 없을 수 있음.
            };
            next();
        } catch (err) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
    }
};
