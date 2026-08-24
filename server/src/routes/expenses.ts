import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';

const router = Router();

// ── Get categories ─────────────────────────────────────────────
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await db('expense_categories').orderBy('name');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get categories' });
  }
});

// ── CRUD Expenses ──────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await db('expenses')
      .leftJoin('expense_categories', 'expenses.category_id', 'expense_categories.id')
      .where({ 'expenses.user_id': req.userId })
      .select('expenses.*', 'expense_categories.name as category_name', 'expense_categories.icon as category_icon', 'expense_categories.color as category_color')
      .orderBy('expenses.amount', 'desc');
    res.json({ success: true, data: expenses });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get expenses' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, name, amount, frequency, isMandatory } = req.body;
    const [id] = await db('expenses').insert({
      user_id: req.userId,
      category_id: categoryId || null,
      name,
      amount,
      frequency: frequency || 'monthly',
      is_mandatory: isMandatory || false,
    });
    const expense = await db('expenses')
      .leftJoin('expense_categories', 'expenses.category_id', 'expense_categories.id')
      .where({ 'expenses.id': id })
      .select('expenses.*', 'expense_categories.name as category_name')
      .first();
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add expense' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, name, amount, frequency, isMandatory } = req.body;
    await db('expenses').where({ id: req.params.id, user_id: req.userId }).update({
      ...(categoryId !== undefined && { category_id: categoryId }),
      ...(name && { name }),
      ...(amount !== undefined && { amount }),
      ...(frequency && { frequency }),
      ...(isMandatory !== undefined && { is_mandatory: isMandatory }),
      updated_at: new Date().toISOString(),
    });
    const updated = await db('expenses').where({ id: req.params.id }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update expense' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db('expenses').where({ id: req.params.id, user_id: req.userId }).delete();
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete expense' });
  }
});

export default router;
