import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { api } from '../../api/client';
import { formatCurrency, getGreeting, getStatusLabel, getGradeColor, getStatusColor } from '../../lib/utils';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Target, CreditCard, ArrowRight,
  AlertTriangle, Shield, Wallet, Landmark, BarChart3, Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { snapshot, healthScore, refreshFinancialData, isLoading } = useFinancial();
  const [goals, setGoals] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      await refreshFinancialData();
      try {
        const [goalsRes, recsRes] = await Promise.all([
          api.getGoals(),
          api.getRecommendations(),
        ]);
        if (goalsRes.success) setGoals(goalsRes.data);
        if (recsRes.success) setRecommendations(recsRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoaded(true);
    }
    load();
  }, []);

  if (!loaded || isLoading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gap: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  const hasData = snapshot && snapshot.totalMonthlyIncome > 0;

  return (
    <div className="page-container">
      {/* Greeting & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {hasData ? "Here's the current state of your Financial Twin." : "Let's set up your Financial Twin to start simulating."}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/simulator" className="btn-secondary" style={{ padding: '10px 20px', fontSize: 14 }}>
            <Sparkles size={16} /> Simulate Decision
          </Link>
          <Link to="/twin" className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
            View Full Twin
          </Link>
        </div>
      </div>

      {!hasData ? (
        /* Empty State */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Initialize Your Financial Twin</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 24px' }}>
            Add your income sources, monthly expenses, and financial targets to construct your personal digital Financial Twin.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/onboarding" className="btn-accent">Complete Onboarding <ArrowRight size={16} /></Link>
            <Link to="/chat" className="btn-secondary">Chat with FTWIN</Link>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Top Row: Health Score + Inflow / Outflow / Surplus */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
            {/* Health Score */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="var(--border)" strokeWidth="6" />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    fill="none"
                    stroke={healthScore ? getGradeColor(healthScore.grade) : 'var(--accent)'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${((healthScore?.totalScore || 0) / (healthScore?.maxScore || 100)) * 188} 188`}
                    transform="rotate(-90 36 36)"
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{healthScore?.totalScore || 0}</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>HEALTH SCORE</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: healthScore ? getGradeColor(healthScore.grade) : 'var(--text-primary)' }}>
                  Grade {healthScore?.grade || 'A'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Score: {healthScore?.totalScore || 0}/100</p>
              </div>
            </motion.div>

            {/* Income */}
            <MetricCard label="MONTHLY INCOME" value={formatCurrency(snapshot.totalMonthlyIncome)} icon={<Wallet size={20} />} color="var(--success)" />

            {/* Expenses */}
            <MetricCard label="MONTHLY EXPENSES" value={formatCurrency(snapshot.totalMonthlyExpenses)} icon={<BarChart3 size={20} />} color={snapshot.totalMonthlyExpenses > snapshot.totalMonthlyIncome ? 'var(--danger)' : 'var(--text-primary)'} />

            {/* Surplus */}
            <MetricCard label="MONTHLY SURPLUS" value={formatCurrency(snapshot.monthlySurplus)} icon={snapshot.monthlySurplus >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />} color={snapshot.monthlySurplus < 0 ? 'var(--danger)' : 'var(--info)'} />
          </div>

          {/* Second Row: Savings, Investments, Debt, Emergency Fund */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 28 }}>
            <MetricCard label="TOTAL SAVINGS" value={formatCurrency(snapshot.totalSavings)} icon={<Landmark size={20} />} />
            <MetricCard label="TOTAL INVESTMENTS" value={formatCurrency(snapshot.totalInvestments)} icon={<TrendingUp size={20} />} color="var(--accent)" />
            <MetricCard label="TOTAL DEBT" value={formatCurrency(snapshot.totalDebt)} icon={<CreditCard size={20} />} color={snapshot.totalDebt > 0 ? 'var(--danger)' : undefined} />
            <MetricCard label="EMERGENCY FUND" value={`${snapshot.emergencyFundMonths} Months`} icon={<Shield size={20} />} color={snapshot.emergencyFundMonths < 3 ? 'var(--danger)' : 'var(--success)'} />
          </div>

          {/* Expense Breakdown Bar */}
          {snapshot.expenseBreakdown && snapshot.expenseBreakdown.length > 0 && (
            <div className="card" style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Monthly Spending Breakdown</h3>
                <Link to="/profile" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Edit Expenses →</Link>
              </div>

              <div style={{ height: 10, borderRadius: 5, background: 'var(--border)', overflow: 'hidden', display: 'flex', marginBottom: 16 }}>
                {snapshot.expenseBreakdown.map((cat: any, i: number) => (
                  <div
                    key={cat.category}
                    style={{
                      height: '100%',
                      width: `${cat.percentage}%`,
                      background: cat.color || `hsl(${i * 45}, 70%, 50%)`,
                      transition: 'width 0.4s ease',
                    }}
                    title={`${cat.category}: ${cat.percentage}%`}
                  />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                {snapshot.expenseBreakdown.slice(0, 6).map((cat: any, i: number) => (
                  <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || `hsl(${i * 45}, 70%, 50%)` }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.category}:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid: Advisor & Goals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
            {/* Recommendations */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Advisor Recommendations</h3>
                <Link to="/advisor" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>View All ({recommendations.length}) →</Link>
              </div>

              {recommendations.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No immediate warnings. Finances look good!</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {recommendations.slice(0, 3).map((rec: any, i: number) => (
                    <div key={i} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span className={`tag-${rec.priority}`}>{rec.priority}</span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{rec.title}</p>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{rec.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goals */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Financial Goals</h3>
                <Link to="/goals" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>Manage Goals →</Link>
              </div>

              {goals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>No financial goals created yet.</p>
                  <Link to="/goals" className="btn-secondary" style={{ fontSize: 13 }}>Create Goal</Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {goals.slice(0, 3).map((goal: any) => {
                    const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                    const status = goal.calculatedStatus?.status || goal.status;
                    return (
                      <div key={goal.id} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{goal.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: getStatusColor(status) }}>{getStatusLabel(status)}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', borderRadius: 3, background: getStatusColor(status), width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                          <span>{formatCurrency(goal.current_amount)}</span>
                          <span>{formatCurrency(goal.target_amount)} ({Math.round(progress)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ color: color || 'var(--text-muted)' }}>{icon}</div>
      </div>
      <p className="financial-number" style={{ fontSize: 22, color: color || 'var(--text-primary)', margin: 0 }}>
        {value}
      </p>
    </motion.div>
  );
}
