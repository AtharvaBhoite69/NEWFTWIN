import React, { useState } from 'react';
import { api } from '../../api/client';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, CheckCircle, Sliders, ShoppingBag } from 'lucide-react';

export default function SimulatorPage() {
  const [params, setParams] = useState({
    salaryChange: '',
    expenseChange: '',
    newInvestmentMonthly: '',
    newLoanEmi: '',
    oneTimeExpense: '',
    purchaseItem: '',
    purchaseAmount: ''
  });
  const [result, setResult] = useState<any>(null);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'simulator' | 'purchase'>('simulator');

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const simParams: any = {};
      if (params.salaryChange) simParams.salaryChange = parseFloat(params.salaryChange);
      if (params.expenseChange) simParams.expenseChange = parseFloat(params.expenseChange);
      if (params.newInvestmentMonthly) simParams.newInvestmentMonthly = parseFloat(params.newInvestmentMonthly);
      if (params.newLoanEmi) simParams.newLoanEmi = parseFloat(params.newLoanEmi);
      if (params.oneTimeExpense) simParams.oneTimeExpense = parseFloat(params.oneTimeExpense);
      const res = await api.simulate(simParams);
      if (res.success) setResult(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handlePurchaseAdvice = async () => {
    if (!params.purchaseItem || !params.purchaseAmount) return;
    setLoading(true);
    try {
      const res = await api.getPurchaseAdvice(params.purchaseItem, parseFloat(params.purchaseAmount));
      if (res.success) setPurchaseResult(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
          Financial Simulator
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Simulate life decisions, salary revisions, new EMIs, and purchase options before committing.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        <button
          onClick={() => setTab('simulator')}
          className={tab === 'simulator' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Sliders size={16} /> Life Simulator
        </button>
        <button
          onClick={() => setTab('purchase')}
          className={tab === 'purchase' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <ShoppingBag size={16} /> Purchase Advisor
        </button>
      </div>

      {tab === 'simulator' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Controls */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Simulation Parameters</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>SALARY REVISION (₹/MONTH)</label>
                <input className="input" type="number" placeholder="e.g. +20000 or -10000" value={params.salaryChange} onChange={e => setParams(p => ({ ...p, salaryChange: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>EXPENSE CHANGE (₹/MONTH)</label>
                <input className="input" type="number" placeholder="e.g. +8000 or -4000" value={params.expenseChange} onChange={e => setParams(p => ({ ...p, expenseChange: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>NEW MONTHLY SIP / INVESTMENT (₹)</label>
                <input className="input" type="number" placeholder="e.g. 10000" value={params.newInvestmentMonthly} onChange={e => setParams(p => ({ ...p, newInvestmentMonthly: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>NEW LOAN EMI (₹/MONTH)</label>
                <input className="input" type="number" placeholder="e.g. 25000" value={params.newLoanEmi} onChange={e => setParams(p => ({ ...p, newLoanEmi: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>ONE-TIME EXPENSE (₹)</label>
                <input className="input" type="number" placeholder="e.g. 500000" value={params.oneTimeExpense} onChange={e => setParams(p => ({ ...p, oneTimeExpense: e.target.value }))} />
              </div>
            </div>

            <button onClick={handleSimulate} disabled={loading} className="btn-accent" style={{ width: '100%', marginTop: 24 }}>
              {loading ? 'Simulating...' : 'Run Simulation'} <ArrowRight size={16} />
            </button>
          </div>

          {/* Results */}
          <div>
            {result ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 20 }}>
                {/* Comparison Card */}
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Impact Analysis</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <CompareRow label="Monthly Surplus" current={result.current.monthlySurplus} simulated={result.simulated.monthlySurplus} isCurrency />
                    <CompareRow label="Savings Rate" current={result.current.savingsRate} simulated={result.simulated.savingsRate} suffix="%" />
                    <CompareRow label="Emergency Fund" current={result.current.emergencyFundMonths} simulated={result.simulated.emergencyFundMonths} suffix=" Mo" />
                    <CompareRow label="Debt-to-Income" current={result.current.debtToIncomeRatio} simulated={result.simulated.debtToIncomeRatio} suffix="%" invertColor />
                    <CompareRow label="Investment Capacity" current={result.current.investmentCapacity} simulated={result.simulated.investmentCapacity} isCurrency />
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="card" style={{ borderLeft: '4px solid var(--danger)', padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', marginBottom: 8 }}>
                      <AlertTriangle size={18} />
                      <strong style={{ fontSize: 14 }}>Simulation Warnings</strong>
                    </div>
                    {result.warnings.map((w: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0' }}>• {w}</p>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="card" style={{ borderLeft: '4px solid var(--success)', padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', marginBottom: 8 }}>
                      <CheckCircle size={18} />
                      <strong style={{ fontSize: 14 }}>Advisor Takeaway</strong>
                    </div>
                    {result.recommendations.map((r: string, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0' }}>• {r}</p>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
                <Sliders size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <h3 style={{ fontSize: 18, marginBottom: 4 }}>No Active Simulation</h3>
                <p style={{ fontSize: 14 }}>Adjust parameters on the left and run the simulation.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Purchase Advisor */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Purchase Details</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>ITEM OR EXPENSE</label>
                <input className="input" placeholder="e.g. MacBook Pro, Vacation..." value={params.purchaseItem} onChange={e => setParams(p => ({ ...p, purchaseItem: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>TOTAL AMOUNT (₹)</label>
                <input className="input" type="number" placeholder="e.g. 150000" value={params.purchaseAmount} onChange={e => setParams(p => ({ ...p, purchaseAmount: e.target.value }))} />
              </div>
            </div>

            <button onClick={handlePurchaseAdvice} disabled={loading} className="btn-accent" style={{ width: '100%', marginTop: 24 }}>
              {loading ? 'Evaluating...' : 'Evaluate Payment Options'} <ArrowRight size={16} />
            </button>
          </div>

          <div>
            {purchaseResult ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 16 }}>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{purchaseResult.item}</h3>
                  <p className="financial-number" style={{ fontSize: 22, color: 'var(--accent)', marginBottom: 16 }}>{formatCurrency(purchaseResult.amount)}</p>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {purchaseResult.options && purchaseResult.options.map((opt: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          border: opt.recommended ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: opt.recommended ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{opt.method}</span>
                          {opt.recommended && <span className="tag-medium">Recommended</span>}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{opt.description}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{opt.reason}</p>
                        {opt.monthlyCost > 0 && (
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)', marginTop: 8, marginBottom: 0 }}>
                            Monthly: {formatCurrency(opt.monthlyCost)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
                <ShoppingBag size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <h3 style={{ fontSize: 18, marginBottom: 4 }}>No Purchase Analyzed</h3>
                <p style={{ fontSize: 14 }}>Enter purchase details to compare Cash, EMI, and Card methods.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, current, simulated, suffix = '', isCurrency = false, invertColor = false }: { label: string; current: number; simulated: number; suffix?: string; isCurrency?: boolean; invertColor?: boolean }) {
  const diff = simulated - current;
  const isPositive = invertColor ? diff < 0 : diff > 0;
  const isNegative = invertColor ? diff > 0 : diff < 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span className="financial-number" style={{ fontSize: 14, color: 'var(--text-muted)', width: 85, textAlign: 'right' }}>
        {isCurrency ? formatCurrency(current) : `${current}${suffix}`}
      </span>
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
      <span className="financial-number" style={{ fontSize: 14, fontWeight: 600, width: 85, textAlign: 'right', color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--text-primary)' }}>
        {isCurrency ? formatCurrency(simulated) : `${simulated}${suffix}`}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, width: 70, textAlign: 'right', color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--text-muted)' }}>
        {diff > 0 ? '+' : ''}{isCurrency ? formatCurrency(diff) : `${diff.toFixed(1)}${suffix}`}
      </span>
    </div>
  );
}
