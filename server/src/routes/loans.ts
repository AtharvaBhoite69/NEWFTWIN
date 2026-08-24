import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';

const router = Router();

// ── Loans CRUD ─────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const loans = await db('loans').where({ user_id: req.userId }).orderBy('emi', 'desc');
    res.json({ success: true, data: loans });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get loans' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { type, name, principal, outstandingAmount, interestRate, emi, tenureMonths, remainingTenureMonths, startDate } = req.body;
    const [id] = await db('loans').insert({
      user_id: req.userId,
      type: type || 'other',
      name,
      principal,
      outstanding_amount: outstandingAmount || principal,
      interest_rate: interestRate,
      emi,
      tenure_months: tenureMonths,
      remaining_tenure_months: remainingTenureMonths || tenureMonths,
      start_date: startDate || new Date().toISOString().split('T')[0],
    });
    const loan = await db('loans').where({ id }).first();
    res.status(201).json({ success: true, data: loan });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add loan' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updates: any = { updated_at: new Date().toISOString() };
    const fieldMap: Record<string, string> = {
      outstandingAmount: 'outstanding_amount', interestRate: 'interest_rate',
      tenureMonths: 'tenure_months', remainingTenureMonths: 'remaining_tenure_months',
      startDate: 'start_date',
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (req.body[key] !== undefined) updates[dbKey] = req.body[key];
    }
    for (const key of ['type', 'name', 'principal', 'emi']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    await db('loans').where({ id: req.params.id, user_id: req.userId }).update(updates);
    const updated = await db('loans').where({ id: req.params.id }).first();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update loan' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db('loans').where({ id: req.params.id, user_id: req.userId }).delete();
    res.json({ success: true, message: 'Loan deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete loan' });
  }
});

// ── Bank Loan Rate Catalog ─────────────────────────────────────
import path from 'path';
import fs from 'fs';

const BANK_RATES_PATH = path.resolve(__dirname, '../../data/bank_loan_rates.json');

function getBankRates() {
  try {
    return JSON.parse(fs.readFileSync(BANK_RATES_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * GET /api/loans/rates?type=home_loan&amount=5000000
 * Returns all banks sorted by min rate for a given loan type + EMI estimate
 */
router.get('/rates', async (req: AuthRequest, res: Response) => {
  try {
    const loanType = (req.query.type as string) || 'home_loan';
    const amount = parseFloat(req.query.amount as string) || 0;
    const tenureYears = parseFloat(req.query.tenure as string) || 20;
    const tenureMonths = tenureYears * 12;

    const banks = getBankRates();

    const validKey = `${loanType}_min`;
    const results = banks
      .filter((b: any) => b[validKey] !== null && b[validKey] !== undefined)
      .map((b: any) => {
        const rateMin = b[`${loanType}_min`];
        const rateMax = b[`${loanType}_max`];
        // Monthly EMI calculation using compound formula
        const monthlyRateMin = rateMin / 100 / 12;
        const emiMin = amount > 0 && tenureMonths > 0
          ? Math.round((amount * monthlyRateMin * Math.pow(1 + monthlyRateMin, tenureMonths)) / (Math.pow(1 + monthlyRateMin, tenureMonths) - 1))
          : null;
        const totalPayableMin = emiMin ? emiMin * tenureMonths : null;
        const totalInterestMin = totalPayableMin ? totalPayableMin - amount : null;

        return {
          bank: b.bank,
          full_name: b.full_name,
          type: b.type,
          rate_min: rateMin,
          rate_max: rateMax,
          processing_fee_pct: b.processing_fee_pct,
          emi_estimate: emiMin,
          total_payable: totalPayableMin,
          total_interest: totalInterestMin,
          max_tenure_yrs: b[`max_tenure_${loanType.replace('_loan', '')}_yrs`] || b.max_tenure_home_yrs,
          source_url: b.source_url,
          verified_date: b.verified_date,
        };
      })
      .sort((a: any, b: any) => a.rate_min - b.rate_min);

    res.json({
      success: true,
      data: results,
      meta: { loanType, amount, tenureYears, count: results.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get loan rates' });
  }
});

export default router;
