import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db/connection';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Register ───────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await db('users').where({ email: data.email }).first();
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const [userId] = await db('users').insert({
      email: data.email,
      password_hash: passwordHash,
      name: data.name,
    });

    // Create default profile
    await db('profiles').insert({
      user_id: userId,
      onboarding_completed: false,
    });

    // Create default preferences
    await db('user_preferences').insert({
      user_id: userId,
      theme: 'light',
    });

    const accessToken = generateAccessToken(userId, data.email);
    const refreshToken = generateRefreshToken(userId, data.email);

    res.status(201).json({
      success: true,
      data: {
        user: { id: userId, email: data.email, name: data.name },
        accessToken,
        refreshToken,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0]?.message || 'Invalid input' });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ── Login ──────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await db('users').where({ email: data.email }).first();
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors[0]?.message || 'Invalid input' });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ── Refresh Token ──────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token required' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    const user = await db('users').where({ id: decoded.userId }).first();
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    const accessToken = generateAccessToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id, user.email);

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
});

// ── Get Current User ───────────────────────────────────────────
router.get('/me', async (req: Request, res: Response) => {
  // This is called with auth middleware from the main router
  const authReq = req as any;
  try {
    const user = await db('users').where({ id: authReq.userId }).first();
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

export default router;
