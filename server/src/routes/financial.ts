import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';
import { getFinancialSnapshot, calculateHealthScore, generateRecommendations, runSimulation, analyzePurchase, calculateGoalStatus } from '../services/financial-engine';

const router = Router();

// ── Financial Snapshot ─────────────────────────────────────────
router.get('/snapshot', async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await getFinancialSnapshot(req.userId!);
    res.json({ success: true, data: snapshot });
  } catch (err) {
    console.error('Snapshot error:', err);
    res.status(500).json({ success: false, error: 'Failed to get financial snapshot' });
  }
});

// ── Health Score ───────────────────────────────────────────────
router.get('/health-score', async (req: AuthRequest, res: Response) => {
  try {
    const score = await calculateHealthScore(req.userId!);
    res.json({ success: true, data: score });
  } catch (err) {
    console.error('Health score error:', err);
    res.status(500).json({ success: false, error: 'Failed to calculate health score' });
  }
});

// ── Advisor Recommendations ───────────────────────────────────
router.get('/recommendations', async (req: AuthRequest, res: Response) => {
  try {
    const recommendations = await generateRecommendations(req.userId!);
    res.json({ success: true, data: recommendations });
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate recommendations' });
  }
});

// ── Run Simulation ────────────────────────────────────────────
router.post('/simulate', async (req: AuthRequest, res: Response) => {
  try {
    const result = await runSimulation(req.userId!, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ success: false, error: 'Failed to run simulation' });
  }
});

// ── Purchase Advisor ──────────────────────────────────────────
router.post('/purchase-advice', async (req: AuthRequest, res: Response) => {
  try {
    const { item, amount } = req.body;
    if (!item || !amount) {
      res.status(400).json({ success: false, error: 'Item and amount required' });
      return;
    }
    const advice = await analyzePurchase(req.userId!, item, amount);
    res.json({ success: true, data: advice });
  } catch (err) {
    console.error('Purchase advice error:', err);
    res.status(500).json({ success: false, error: 'Failed to analyze purchase' });
  }
});

// ── Twin Data (combined snapshot + health + goals) ────────────
router.get('/twin', async (req: AuthRequest, res: Response) => {
  try {
    const [snapshot, healthScore, goals, investments, loans] = await Promise.all([
      getFinancialSnapshot(req.userId!),
      calculateHealthScore(req.userId!),
      db('financial_goals').where({ user_id: req.userId }),
      db('investments').where({ user_id: req.userId }),
      db('loans').where({ user_id: req.userId }),
    ]);

    // Calculate goal statuses
    const goalsWithStatus = await Promise.all(
      goals.map(async (goal: any) => {
        const status = await calculateGoalStatus(goal.id);
        return { ...goal, calculatedStatus: status };
      })
    );

    res.json({
      success: true,
      data: {
        snapshot,
        healthScore,
        goals: goalsWithStatus,
        investments,
        loans,
      },
    });
  } catch (err) {
    console.error('Twin data error:', err);
    res.status(500).json({ success: false, error: 'Failed to get twin data' });
  }
});

export default router;
