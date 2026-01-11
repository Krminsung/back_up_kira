import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../lib/db';

// Google OAuth는 선택적 - 환경변수가 있을 때만 활성화
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: '/api/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0].value;
                    if (!email) {
                        return done(new Error('No email found from Google profile'));
                    }

                    // Find or create user
                    let result = await pool.query(
                        'SELECT * FROM users WHERE email = $1',
                        [email]
                    );

                    let user = result.rows[0];

                    if (!user) {
                        const insertResult = await pool.query(
                            `INSERT INTO users (email, name, password, avatar) 
                             VALUES ($1, $2, $3, $4) 
                             RETURNING *`,
                            [
                                email,
                                profile.displayName || 'Unknown',
                                '', // OAuth user has no password
                                profile.photos?.[0].value || null
                            ]
                        );
                        user = insertResult.rows[0];
                    }

                    return done(null, user);
                } catch (error) {
                    return done(error as Error);
                }
            }
        )
    );
    console.log('✅ Google OAuth enabled');
} else {
    console.log('ℹ️  Google OAuth disabled (no credentials provided)');
}

export default passport;
