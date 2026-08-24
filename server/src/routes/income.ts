import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';

const router = Router();

// ══════════════════════════════════════════════════════════════
// INCOME SOURCES
// ══════════════════════════════════════════════════════════════

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const sources = await db('income_sources').where({ user_id: req.userId }).orderBy('is_primary', 'desc');
    res.json({ success: true, data: sources });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get income sources' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, name, amount, frequency, isPrimary } = req.body;
    const [id] = await db('income_sources').insert({
      user_id: req.userId,
      type: type || 'salary',
      name,
      amount,
      frequency: frequency || 'monthly',
      is_primary: isPrimary || false,
    });
    const source = await db('income_sources').where({ id }).first();
    res.status(201).json({ success: true, data: source });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add income source' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { type, name, amount, frequency, isPrimary } = req.body;
    await db('income_sources').where({ id: req.params.id, user_id: req.userId }).update({
      ...(type && { type }),
      ...(name && { name }),
      ...(amount !== undefined && { amount }),
      ...(frequency && { frequency }),
      ...(isPrimary !== undefined && { is_primary: isPrimary }),
      updated_at: new Date().toISOString(),
    });
    const updated = await db('income_sources').where({ id: req.params.id }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update income source' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db('income_sources').where({ id: req.params.id, user_id: req.userId }).delete();
    res.json({ success: true, message: 'Income source deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete income source' });
  }
});

export default router;
