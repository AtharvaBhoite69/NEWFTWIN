import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatCurrency, getGradeColor } from '../../lib/utils';
import { motion } from 'framer-motion';
import { BrainCircuit, TrendingUp, TrendingDown, Wallet, BarChart3, Shield, Target, CreditCard, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TwinPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTwinData().then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  if (!data || data.snapshot.totalMonthlyIncome === 0) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <BrainCircuit size={48} style={{ color: 'var(--accent)', marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Digital Twin Uninitialized</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 24px' }}>
            Add your income sources, monthly fixed expenses, and existing assets to construct your personalized Financial Twin.
          </p>
          <Link to="/profile" className="btn-accent">Set Up Profile & Finances</Link>
        </div>
      </div>
    );
  }

  const { snapshot, healthScore } = data;
  const s = snapshot;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
          Your Financial Twin
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          A live synchronized digital replica of your income, outflows, liabilities, and assets.
        </p>
      </div>

      {/* Main Score Cockpit */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card"
        style={{ textAlign: 'center', padding: '40px 24px', marginBottom: 32 }}
      >
        <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={getGradeColor(healthScore?.grade)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${((healthScore?.totalScore || 0) / (healthScore?.maxScore || 100)) * 314} 314`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 800 }}>{healthScore?.totalScore || 0}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 700, color: getGradeColor(healthScore?.grade), margin: '0 0 4px' }}>
          Grade {healthScore?.grade} Health Score
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Computed across 5 core dimensions of Indian household finances.
        </p>
      </motion.div>

      {/* Component Scores */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Health Score Diagnostics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
        {healthScore?.components?.map((comp: any, i: number) => {
          const ratio = comp.score / comp.maxScore;
          const statusColor = ratio >= 0.75 ? 'var(--success)' : ratio >= 0.5 ? 'var(--warning)' : 'var(--danger)';
          return (
            <motion.div key={comp.name} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{comp.name}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: statusColor }}>{comp.score} / {comp.maxScore} pts</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: statusColor, width: `${ratio * 100}%` }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 8px' }}>{comp.reason}</p>
              <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, margin: 0 }}>→ {comp.improvement}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Financial Metrics Matrix */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Financial Snapshot Matrix</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MatrixCard icon={<Wallet size={16} />} label="MONTHLY INCOME" value={formatCurrency(s.totalMonthlyIncome)} />
        <MatrixCard icon={<BarChart3 size={16} />} label="MONTHLY EXPENSES" value={formatCurrency(s.totalMonthlyExpenses)} />
        <MatrixCard icon={s.monthlySurplus >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />} label="NET MONTHLY SURPLUS" value={formatCurrency(s.monthlySurplus)} color={s.monthlySurplus < 0 ? 'var(--danger)' : 'var(--info)'} />
        <MatrixCard icon={<Landmark size={16} />} label="LIQUID SAVINGS" value={formatCurrency(s.totalSavings)} />
        <MatrixCard icon={<TrendingUp size={16} />} label="INVESTMENTS" value={formatCurrency(s.totalInvestments)} color="var(--accent)" />
        <MatrixCard icon={<CreditCard size={16} />} label="TOTAL DEBT" value={formatCurrency(s.totalDebt)} color={s.totalDebt > 0 ? 'var(--danger)' : undefined} />
        <MatrixCard icon={<Shield size={16} />} label="EMERGENCY FUND" value={`${s.emergencyFundMonths} Months`} color={s.emergencyFundMonths < 3 ? 'var(--danger)' : 'var(--success)'} />
        <MatrixCard icon={<Target size={16} />} label="SAVINGS RATE" value={`${s.savingsRate}%`} color="var(--success)" />
      </div>
    </div>
  );
}

function MatrixCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: color || 'var(--text-muted)' }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <p className="financial-number" style={{ fontSize: 20, color: color || 'var(--text-primary)', margin: 0 }}>
        {value}
      </p>
    </div>
  );
}
