import dotenv from 'dotenv';
import path from 'path';

// Load from server/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'ftwin-dev-secret-change-in-production-2024',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'ftwin-refresh-secret-change-in-production-2024',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  db: {
    filename: path.resolve(__dirname, '../../data/ftwin.db'),
  },
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like server-to-server, mobile, curl)
      if (!origin) return callback(null, true);
      const allowedEnv = process.env.CORS_ORIGIN;
      if (allowedEnv && allowedEnv !== '*') {
        const allowedList = allowedEnv.split(',').map(s => s.trim().toLowerCase());
        if (allowedList.includes(origin.toLowerCase())) {
          return callback(null, true);
        }
      }
      // Allow any vercel preview / production deployment or localhost
      if (origin.includes('.vercel.app') || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.loca.lt')) {
        return callback(null, true);
      }
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder'],
  },
};
