import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await db('notifications')
      .where({ user_id: req.userId })
      .orderBy('created_at', 'desc')
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
});

router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await db('notifications').where({ id: req.params.id, user_id: req.userId }).update({ is_read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await db('notifications').where({ user_id: req.userId, is_read: false }).update({ is_read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

// ── Preferences ────────────────────────────────────────────────
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const prefs = await db('user_preferences').where({ user_id: req.userId }).first();
    res.json({ success: true, data: prefs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get preferences' });
  }
});

router.put('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const { theme, currency, language, notificationsEnabled } = req.body;
    await db('user_preferences').where({ user_id: req.userId }).update({
      ...(theme && { theme }),
      ...(currency && { currency }),
      ...(language && { language }),
      ...(notificationsEnabled !== undefined && { notifications_enabled: notificationsEnabled }),
      updated_at: new Date().toISOString(),
    });
    const updated = await db('user_preferences').where({ user_id: req.userId }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

export default router;
