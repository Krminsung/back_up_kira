import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import passport from 'passport';
import path from 'path';
import chatRouter from './routes/chat';
import usageRouter from './routes/usage';
import authRouter from './routes/auth';
import charactersRouter from './routes/characters';
import conversationsRouter from './routes/conversations';
import uploadRouter from './routes/upload';
import './config/passport'; // Import to initialize passport strategies

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3003',
    credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // 파일 업로드를 위해 limit 증가
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Static files for uploads (use absolute path for Docker)
app.use('/uploads', express.static('/app/uploads'));

// Initialize Passport
app.use(passport.initialize());

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/usage', usageRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/upload', uploadRouter);

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
