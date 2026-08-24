import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';

const router = Router();

// ── User Investments ───────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const investments = await db('investments').where({ user_id: req.userId }).orderBy('current_value', 'desc');
    res.json({ success: true, data: investments });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get investments' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, name, investedAmount, currentValue, monthlyContribution, startDate, maturityDate, interestRate } = req.body;
    const [id] = await db('investments').insert({
      user_id: req.userId,
      type: type || 'other',
      name,
      invested_amount: investedAmount,
      current_value: currentValue || investedAmount,
      monthly_contribution: monthlyContribution || 0,
      start_date: startDate || new Date().toISOString().split('T')[0],
      maturity_date: maturityDate || null,
      interest_rate: interestRate || null,
    });
    const investment = await db('investments').where({ id }).first();
    res.status(201).json({ success: true, data: investment });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add investment' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updates: any = { updated_at: new Date().toISOString() };
    const fields = ['type', 'name', 'investedAmount', 'currentValue', 'monthlyContribution', 'startDate', 'maturityDate', 'interestRate'];
    const dbFields: Record<string, string> = {
      investedAmount: 'invested_amount', currentValue: 'current_value',
      monthlyContribution: 'monthly_contribution', startDate: 'start_date',
      maturityDate: 'maturity_date', interestRate: 'interest_rate',
    };
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates[dbFields[field] || field] = req.body[field];
      }
    }
    await db('investments').where({ id: req.params.id, user_id: req.userId }).update(updates);
    const updated = await db('investments').where({ id: req.params.id }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update investment' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db('investments').where({ id: req.params.id, user_id: req.userId }).delete();
    res.json({ success: true, message: 'Investment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete investment' });
  }
});

// ── Investment Products Catalog ────────────────────────────────
router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const products = await db('investment_products').orderBy('risk_level');
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get investment products' });
  }
});

export default router;
