import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';
import { calculateGoalStatus } from '../services/financial-engine';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const goals = await db('financial_goals').where({ user_id: req.userId }).orderBy('priority', 'asc');
    const goalsWithStatus = await Promise.all(
      goals.map(async (goal: any) => {
        const status = await calculateGoalStatus(goal.id);
        return { ...goal, calculatedStatus: status };
      })
    );
    res.json({ success: true, data: goalsWithStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get goals' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, targetAmount, currentAmount, targetDate, monthlyContribution, priority } = req.body;
    const [id] = await db('financial_goals').insert({
      user_id: req.userId,
      name,
      type: type || 'custom',
      target_amount: targetAmount,
      current_amount: currentAmount || 0,
      target_date: targetDate,
      monthly_contribution: monthlyContribution || 0,
      priority: priority || 'medium',
      status: 'on_track',
    });
    const goal = await db('financial_goals').where({ id }).first();
    const status = await calculateGoalStatus(id);
    await db('financial_goals').where({ id }).update({ status: status.status });
    res.status(201).json({ success: true, data: { ...goal, status: status.status, calculatedStatus: status } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create goal' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, targetAmount, currentAmount, targetDate, monthlyContribution, priority } = req.body;
    await db('financial_goals').where({ id: req.params.id, user_id: req.userId }).update({
      ...(name && { name }),
      ...(type && { type }),
      ...(targetAmount !== undefined && { target_amount: targetAmount }),
      ...(currentAmount !== undefined && { current_amount: currentAmount }),
      ...(targetDate && { target_date: targetDate }),
      ...(monthlyContribution !== undefined && { monthly_contribution: monthlyContribution }),
      ...(priority && { priority }),
      updated_at: new Date().toISOString(),
    });
    // Recalculate status
    const status = await calculateGoalStatus(parseInt(String(req.params.id), 10));
    await db('financial_goals').where({ id: req.params.id }).update({ status: status.status });
    const updated = await db('financial_goals').where({ id: req.params.id }).first();
    res.json({ success: true, data: { ...updated, calculatedStatus: status } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update goal' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db('financial_goals').where({ id: req.params.id, user_id: req.userId }).delete();
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete goal' });
  }
});

router.post('/:id/contribute', async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const goal = await db('financial_goals').where({ id: req.params.id, user_id: req.userId }).first();
    if (!goal) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }
    await db('goal_contributions').insert({
      goal_id: goal.id,
      amount,
      date: new Date().toISOString().split('T')[0],
    });
    await db('financial_goals').where({ id: goal.id }).update({
      current_amount: goal.current_amount + amount,
      updated_at: new Date().toISOString(),
    });
    const status = await calculateGoalStatus(goal.id);
    await db('financial_goals').where({ id: goal.id }).update({ status: status.status });
    const updated = await db('financial_goals').where({ id: goal.id }).first();
    res.json({ success: true, data: { ...updated, calculatedStatus: status } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add contribution' });
  }
});

export default router;
