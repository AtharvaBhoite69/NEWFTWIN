import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await db('bank_accounts').where({ user_id: req.userId }).orderBy('balance', 'desc');
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get bank accounts' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { bankName, accountType, balance, accountNumber } = req.body;
    const [id] = await db('bank_accounts').insert({
      user_id: req.userId,
      bank_name: bankName,
      account_type: accountType || 'savings',
      balance: balance || 0,
      account_number: accountNumber || null,
      is_connected: false,
    });
    const account = await db('bank_accounts').where({ id }).first();
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add bank account' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { bankName, accountType, balance, accountNumber } = req.body;
    await db('bank_accounts').where({ id: req.params.id, user_id: req.userId }).update({
      ...(bankName && { bank_name: bankName }),
      ...(accountType && { account_type: accountType }),
      ...(balance !== undefined && { balance }),
      ...(accountNumber !== undefined && { account_number: accountNumber }),
      updated_at: new Date().toISOString(),
    });
    const updated = await db('bank_accounts').where({ id: req.params.id }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update bank account' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db('bank_accounts').where({ id: req.params.id, user_id: req.userId }).delete();
    res.json({ success: true, message: 'Bank account deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete bank account' });
  }
});

export default router;
