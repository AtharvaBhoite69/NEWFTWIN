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
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
};
