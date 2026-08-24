import React from 'react';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, AlertTriangle, CheckCircle, Wallet, PiggyBank, Target, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   VISUAL DATA DISPATCHER
   ═══════════════════════════════════════════════════════════════ */

export function ChatVisual({ visualData }: { visualData: any }) {
  if (!visualData?.type) return null;

  switch (visualData.type) {
    case 'snapshot':
      return <SnapshotCard data={visualData} />;
    case 'investment':
      return <InvestmentCard data={visualData} />;
    case 'purchase':
      return <PurchaseOptionsCard data={visualData} />;
    case 'health_score':
      return <HealthScoreCard data={visualData} />;
    case 'goal_plan':
      return <GoalPlanCard data={visualData} />;
    case 'loan_compare':
      return <LoanCompareCard data={visualData} />;
    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   SHARED STYLES
   ═══════════════════════════════════════════════════════════════ */

const cardStyle: React.CSSProperties = {
  marginTop: 14,
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--bg-secondary)',
  overflow: 'hidden',
};

const metricBoxStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-subtle)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
  marginBottom: 4,
};

const valueStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  fontFamily: "'Inter', 'SF Mono', monospace",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
  padding: '10px 14px 6px',
};

/* ═══════════════════════════════════════════════════════════════
   1. SNAPSHOT CARD
   ═══════════════════════════════════════════════════════════════ */

function SnapshotCard({ data }: { data: any }) {
  const s = data.snapshot;
  if (!s || s.totalMonthlyIncome === 0) return null;

  const barData = [
    { name: 'Income', value: s.totalMonthlyIncome, fill: '#22C55E' },
    { name: 'Expenses', value: s.totalMonthlyExpenses, fill: '#F97316' },
    { name: 'EMIs', value: s.totalEMIs, fill: '#EF4444' },
    { name: 'Surplus', value: Math.max(0, s.monthlySurplus), fill: '#3B82F6' },
  ];

  const surplusColor = s.monthlySurplus >= 0 ? '#22C55E' : '#EF4444';
  const savingsColor = s.savingsRate >= 20 ? '#22C55E' : s.savingsRate >= 10 ? '#F59E0B' : '#EF4444';
  const emergencyColor = s.emergencyFundMonths >= 6 ? '#22C55E' : s.emergencyFundMonths >= 3 ? '#F59E0B' : '#EF4444';
  const debtColor = s.debtToIncomeRatio <= 20 ? '#22C55E' : s.debtToIncomeRatio <= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div style={cardStyle}>
      <div style={sectionTitleStyle}>📊 Financial Snapshot</div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '4px 10px 10px' }}>
        <MetricBox label="Monthly Income" value={formatCurrency(s.totalMonthlyIncome)} color="#22C55E" icon={<Wallet size={12} />} />
        <MetricBox label="Monthly Expenses" value={formatCurrency(s.totalMonthlyExpenses)} color="#F97316" icon={<CreditCard size={12} />} />
        <MetricBox label="Surplus" value={formatCurrency(s.monthlySurplus)} color={surplusColor} icon={s.monthlySurplus >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} />
        <MetricBox label="Savings Rate" value={`${s.savingsRate}%`} color={savingsColor} icon={<PiggyBank size={12} />} />
        <MetricBox label="Emergency Fund" value={`${s.emergencyFundMonths} Mo`} color={emergencyColor} icon={<ShieldCheck size={12} />} />
        <MetricBox label="Debt-to-Income" value={`${s.debtToIncomeRatio}%`} color={debtColor} icon={<Target size={12} />} />
      </div>

      {/* Income vs Expenses Bar Chart */}
      <div style={{ padding: '4px 6px 8px' }}>
        <div style={{ ...sectionTitleStyle, padding: '6px 8px 4px' }}>Cash Flow Breakdown</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 4 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => formatCurrency(Number(v) || 0)}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
              {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense Breakdown Pie */}
      {data.expenseBreakdown && data.expenseBreakdown.length > 0 && (
        <ExpenseBreakdownChart breakdown={data.expenseBreakdown} />
      )}

      {/* Net Worth footer */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>NET WORTH</span>
        <span style={{ ...valueStyle, fontSize: 16, color: s.netWorth >= 0 ? '#22C55E' : '#EF4444' }}>
          {formatCurrency(s.netWorth)}
        </span>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div style={metricBoxStyle}>
      <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon && <span style={{ color, opacity: 0.8 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ ...valueStyle, color, fontSize: 15 }}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. EXPENSE BREAKDOWN PIE CHART
   ═══════════════════════════════════════════════════════════════ */

function ExpenseBreakdownChart({ breakdown }: { breakdown: any[] }) {
  const top = breakdown.slice(0, 6);
  return (
    <div style={{ padding: '4px 10px 10px' }}>
      <div style={{ ...sectionTitleStyle, padding: '6px 4px 4px' }}>Expense Categories</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ResponsiveContainer width={100} height={100}>
          <PieChart>
            <Pie data={top} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={28} outerRadius={44} strokeWidth={0}>
              {top.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: 'grid', gap: 3 }}>
          {top.map((cat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color || COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.category}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: "'Inter', monospace" }}>{cat.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#A855F7', '#06B6D4', '#F97316', '#EC4899'];

/* ═══════════════════════════════════════════════════════════════
   3. PURCHASE OPTIONS CARD
   ═══════════════════════════════════════════════════════════════ */

function PurchaseOptionsCard({ data }: { data: any }) {
  if (!data.options || data.options.length === 0) return null;

  return (
    <div style={cardStyle}>
      <div style={{ padding: '12px 14px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={sectionTitleStyle}>🛍️ Purchase & Payment Intelligence</div>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            Item: <strong>{data.item}</strong>
          </p>
        </div>
        <span style={{ ...valueStyle, fontSize: 18, color: 'var(--accent)' }}>{formatCurrency(data.amount)}</span>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gap: 8, padding: '4px 10px 10px' }}>
        {data.options.map((opt: any, i: number) => {
          const card = opt.cardDetails;
          const hasImage = Boolean(card?.image_url && card.image_url.trim().length > 0);

          return (
            <div
              key={i}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: opt.recommended ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: opt.recommended ? 'var(--accent-subtle)' : 'var(--bg-primary)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Real Card Image if option has cardDetails */}
                {card && (
                  <div
                    style={{
                      width: 68,
                      height: 43,
                      borderRadius: 6,
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: hasImage ? '#0f172a' : 'rgba(200,169,126,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {hasImage ? (
                      <img src={card.image_url} alt={card.card_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <CreditCard size={18} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                    )}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{opt.method}</span>
                    {opt.recommended && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: '#000', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.03em' }}>
                        ✓ FTWIN BEST
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.4 }}>{opt.description}</p>
                  
                  {opt.reason && (
                    <p style={{ fontSize: 11, color: 'var(--accent)', margin: '0 0 4px', fontWeight: 500 }}>
                      💡 {opt.reason}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                    {opt.monthlyCost > 0 && <span>Monthly: <strong style={{ color: 'var(--info)' }}>{formatCurrency(opt.monthlyCost)}</strong></span>}
                    <span>Effective Cost: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(opt.totalCost)}</strong></span>
                    {opt.rewardEstimate && opt.rewardEstimate > 0 && (
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>+₹{opt.rewardEstimate} Cashback/Rewards</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cost Comparison Bar */}
      {data.options.length > 1 && (
        <div style={{ padding: '4px 6px 10px' }}>
          <div style={{ ...sectionTitleStyle, padding: '4px 8px' }}>Total Cost Comparison</div>
          <ResponsiveContainer width="100%" height={data.options.length * 28 + 10}>
            <BarChart
              data={data.options.map((o: any) => ({ name: o.method.replace(/^Credit Card: /, 'CC: ').replace(/^Best Match Card: /, 'Match: '), cost: o.totalCost, fill: o.recommended ? '#C8A97E' : '#6B7280' }))}
              layout="vertical"
              margin={{ top: 0, right: 10, bottom: 0, left: 4 }}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => formatCurrency(Number(v) || 0)} />
              <Bar dataKey="cost" radius={[0, 6, 6, 0]} barSize={14}>
                {data.options.map((o: any, i: number) => <Cell key={i} fill={o.recommended ? '#C8A97E' : '#6B728088'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div style={{ padding: '8px 14px 10px', borderTop: '1px solid var(--border-subtle)' }}>
          {data.warnings.map((w: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12, color: '#EF4444' }}>
              <AlertTriangle size={12} style={{ marginTop: 2, flexShrink: 0 }} /> {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. INVESTMENT CARD
   ═══════════════════════════════════════════════════════════════ */

function InvestmentCard({ data }: { data: any }) {
  return (
    <div style={cardStyle}>
      <div style={sectionTitleStyle}>📈 Investment Intelligence</div>

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '4px 10px' }}>
        <MetricBox
          label="Available to Invest"
          value={formatCurrency(data.investmentCapacity)}
          color={data.investmentCapacity > 0 ? '#22C55E' : '#EF4444'}
          icon={<ArrowUpRight size={12} />}
        />
        <MetricBox
          label="Current SIPs"
          value={formatCurrency(data.currentMonthlyContributions)}
          color="#3B82F6"
          icon={<TrendingUp size={12} />}
        />
      </div>

      {/* Health indicators */}
      <div style={{ display: 'flex', gap: 12, padding: '8px 14px', fontSize: 12 }}>
        <StatusPill
          label={`Savings: ${data.savingsRate}%`}
          ok={data.savingsRate >= 20}
          warn={data.savingsRate >= 10 && data.savingsRate < 20}
        />
        <StatusPill
          label={`Emergency: ${data.emergencyFundMonths} Mo`}
          ok={data.emergencyFundMonths >= 3}
          warn={data.emergencyFundMonths >= 1 && data.emergencyFundMonths < 3}
        />
      </div>

      {/* Suggested Allocation Donut */}
      {data.suggestedAllocation && data.suggestedAllocation.length > 0 && (
        <div style={{ padding: '4px 10px 12px' }}>
          <div style={{ ...sectionTitleStyle, padding: '6px 4px 6px' }}>Suggested Monthly Allocation</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={data.suggestedAllocation} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={48} strokeWidth={0}>
                  {data.suggestedAllocation.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'grid', gap: 5 }}>
              {data.suggestedAllocation.map((item: any, i: number) => {
                const amount = data.investmentCapacity > 0
                  ? Math.round((item.value / 100) * data.investmentCapacity)
                  : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: "'Inter', monospace", fontSize: 10 }}>
                      {item.value}% {amount > 0 && `· ${formatCurrency(amount)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ label, ok, warn }: { label: string; ok: boolean; warn?: boolean }) {
  const color = ok ? '#22C55E' : warn ? '#F59E0B' : '#EF4444';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {ok ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   5. HEALTH SCORE CARD
   ═══════════════════════════════════════════════════════════════ */

function HealthScoreCard({ data }: { data: any }) {
  const percentage = data.maxScore > 0 ? (data.totalScore / data.maxScore) * 100 : 0;
  const gaugeColor = percentage >= 70 ? '#22C55E' : percentage >= 50 ? '#F59E0B' : '#EF4444';

  // SVG circular gauge params
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={cardStyle}>
      <div style={sectionTitleStyle}>🏥 Financial Health Score</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '8px 14px 14px' }}>
        {/* Circular Gauge */}
        <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
            {/* Progress arc */}
            <circle
              cx="50" cy="50" r={radius} fill="none"
              stroke={gaugeColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          {/* Center text */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: gaugeColor, lineHeight: 1 }}>
              {data.totalScore}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              / {data.maxScore}
            </span>
          </div>
        </div>

        {/* Grade + summary */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 20, fontWeight: 800, color: gaugeColor,
              background: `${gaugeColor}18`, padding: '2px 10px', borderRadius: 8,
            }}>
              {data.grade}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {percentage >= 85 ? 'Excellent' : percentage >= 70 ? 'Good' : percentage >= 55 ? 'Fair' : percentage >= 40 ? 'Needs Work' : 'Critical'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Score based on 7 financial dimensions
          </p>
        </div>
      </div>

      {/* Component Breakdown Bars */}
      {data.components && data.components.length > 0 && (
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ ...sectionTitleStyle, padding: '4px 0 8px' }}>Component Breakdown</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.components.map((comp: any, i: number) => {
              const pct = comp.maxScore > 0 ? (comp.score / comp.maxScore) * 100 : 0;
              const barColor = pct >= 70 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{comp.name}</span>
                    <span style={{ fontWeight: 700, color: barColor, fontFamily: "'Inter', monospace" }}>{comp.score}/{comp.maxScore}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-primary)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: barColor, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   6. GOAL PLAN CARD
   ═══════════════════════════════════════════════════════════════ */

const GOAL_ICONS: Record<string, string> = {
  marriage: '💒',
  car: '🚗',
  house: '🏠',
  education: '🎓',
  travel: '✈️',
  custom: '🎯',
};

function GoalPlanCard({ data }: { data: any }) {
  const icon = GOAL_ICONS[data.goalType] || '🎯';
  const progressPct = data.currentSavings > 0 && data.targetAmount > 0
    ? Math.min(100, Math.round((data.currentSavings / data.targetAmount) * 100))
    : 0;

  const barData = [
    { name: 'Target', value: data.targetAmount, fill: '#C8A97E' },
    { name: 'Current Savings', value: data.currentSavings, fill: '#22C55E' },
  ];

  if (data.snapshot) {
    barData.push(
      { name: 'Monthly Income', value: data.snapshot.totalMonthlyIncome, fill: '#3B82F6' },
      { name: 'Monthly Expenses', value: data.snapshot.totalMonthlyExpenses, fill: '#F97316' },
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ ...sectionTitleStyle, padding: 0 }}>{data.goalName} Goal</div>
          <div style={{ ...valueStyle, color: 'var(--accent)', fontSize: 20, marginTop: 2 }}>{formatCurrency(data.targetAmount)}</div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '6px 10px' }}>
        <MetricBox
          label="Current Savings"
          value={formatCurrency(data.currentSavings)}
          color={data.currentSavings > 0 ? '#22C55E' : 'var(--text-muted)'}
          icon={<PiggyBank size={12} />}
        />
        <MetricBox
          label="Monthly Surplus"
          value={formatCurrency(data.monthlySurplus)}
          color={data.monthlySurplus > 0 ? '#3B82F6' : '#EF4444'}
          icon={<Wallet size={12} />}
        />
        <MetricBox
          label="Time to Goal"
          value={data.monthsToGoal > 0 ? `${data.monthsToGoal} Mo` : '—'}
          color={data.monthsToGoal > 0 && data.monthsToGoal <= 24 ? '#22C55E' : data.monthsToGoal > 0 ? '#F59E0B' : '#EF4444'}
          icon={<Target size={12} />}
        />
      </div>

      {/* Progress Bar */}
      <div style={{ padding: '8px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: "'Inter', monospace" }}>{progressPct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-primary)', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            borderRadius: 4,
            background: 'linear-gradient(90deg, #C8A97E, #D4AF37)',
            transition: 'width 0.8s ease',
            minWidth: progressPct > 0 ? 4 : 0,
          }} />
        </div>
      </div>

      {/* Comparison Chart */}
      <div style={{ padding: '4px 6px 10px' }}>
        <div style={{ ...sectionTitleStyle, padding: '6px 8px 4px' }}>Financial Context</div>
        <ResponsiveContainer width="100%" height={barData.length * 28 + 10}>
          <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 4 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => formatCurrency(Number(v) || 0)} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
              {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Suggested monthly if possible */}
      {data.suggestedMonthly > 0 && (
        <div style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Suggested monthly saving</span>
          <span style={{ ...valueStyle, fontSize: 15, color: '#22C55E' }}>{formatCurrency(data.suggestedMonthly)}/mo</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   7. COMPARISON CARD (Before / After)
   ═══════════════════════════════════════════════════════════════ */

export function ComparisonCard({ before, after }: { before: any; after: any }) {
  if (!before || !after) return null;

  const metrics = [
    { label: 'Monthly Surplus', key: 'monthlySurplus', isCurrency: true },
    { label: 'Savings Rate', key: 'savingsRate', suffix: '%' },
    { label: 'Emergency Fund', key: 'emergencyFundMonths', suffix: ' Mo' },
    { label: 'Investment Capacity', key: 'investmentCapacity', isCurrency: true },
    { label: 'Debt-to-Income', key: 'debtToIncomeRatio', suffix: '%', invert: true },
  ];

  return (
    <div style={{ ...cardStyle, marginTop: 10 }}>
      <div style={sectionTitleStyle}>📊 Impact on Your Finances</div>
      <div style={{ padding: '4px 10px 10px' }}>
        {metrics.map((m, i) => {
          const bVal = before[m.key] || 0;
          const aVal = after[m.key] || 0;
          const diff = aVal - bVal;
          const isPositive = m.invert ? diff < 0 : diff > 0;
          const isNegative = m.invert ? diff > 0 : diff < 0;
          const diffColor = isPositive ? '#22C55E' : isNegative ? '#EF4444' : 'var(--text-muted)';

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderBottom: i < metrics.length - 1 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12 }}>
              <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{m.label}</span>
              <span style={{ width: 80, textAlign: 'right', color: 'var(--text-muted)', fontFamily: "'Inter', monospace" }}>
                {m.isCurrency ? formatCurrency(bVal) : `${bVal}${m.suffix || ''}`}
              </span>
              <span style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: 10 }}>→</span>
              <span style={{ width: 80, textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Inter', monospace" }}>
                {m.isCurrency ? formatCurrency(aVal) : `${aVal}${m.suffix || ''}`}
              </span>
              <span style={{ width: 60, textAlign: 'right', fontWeight: 700, color: diffColor, fontFamily: "'Inter', monospace", fontSize: 11 }}>
                {diff > 0 ? '+' : ''}{m.isCurrency ? formatCurrency(diff) : `${diff.toFixed(1)}${m.suffix || ''}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════════
   LOAN COMPARE CARD
   Shows bank interest rate comparison, EMI estimates, and ranked table
   ═══════════════════════════════════════════════════════════════ */

const BANK_TYPE_COLOR: Record<string, string> = {
  PSU: '#22C55E',
  Private: '#3B82F6',
  NBFC: '#F59E0B',
  Foreign: '#A855F7',
};

function LoanCompareCard({ data }: { data: any }) {
  const banks: any[] = data.banks || [];
  if (banks.length === 0) return null;

  const lowestRate = banks[0]?.rate_min;
  const highestRate = banks[banks.length - 1]?.rate_min;

  const barData = banks.map((b: any) => ({
    name: b.bank.replace(' Bank', '').replace(' Mahindra', '').replace(' FIRST', '').replace('State Bank of India', 'SBI').replace('Punjab National Bank', 'PNB').replace('Bank of Baroda', 'BOB').replace(' Finserv', ''),
    rate: b.rate_min,
    emi: b.emi_estimate,
    type: b.bank_type,
  }));

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={sectionTitleStyle}>🏦 {data.loanTypeLabel || 'Loan'} — Bank Interest Rate Comparison</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {data.amount > 0 ? `For ₹${(data.amount / 100000).toFixed(1)} Lakh over ${data.tenureYears} years` : 'Current market rates'}
              {' · '}
              <span style={{ color: '#22C55E', fontWeight: 600 }}>Best: {lowestRate}%</span>
              {' · '}
              <span style={{ color: '#EF4444' }}>Highest: {highestRate}%</span>
            </p>
          </div>
          <span style={{ fontSize: 10, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '3px 8px', color: 'var(--text-muted)' }}>
            {banks.length} Banks
          </span>
        </div>
      </div>

      {/* Interest Rate Bar Chart */}
      <div style={{ padding: '12px 8px 4px' }}>
        <div style={{ ...sectionTitleStyle, padding: '0 8px 8px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interest Rate (%) — Lowest to Highest</div>
        <ResponsiveContainer width="100%" height={banks.length * 30 + 10}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 0, right: 30, bottom: 0, left: 10 }}
          >
            <XAxis type="number" domain={[Math.max(0, lowestRate - 0.5), highestRate + 0.5]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} axisLine={false} />
            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any, _name: any, props: any) => [
                `${v}% p.a.${props?.payload?.emi ? ` · EMI: ${formatCurrency(props.payload.emi)}/mo` : ''}`,
                'Interest Rate',
              ]}
            />
            <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={16}>
              {barData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={index === 0 ? '#22C55E' : index <= 2 ? '#C8A97E' : '#6B728066'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked Bank Table */}
      <div style={{ padding: '4px 14px 14px' }}>
        <div style={{ ...sectionTitleStyle, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Detailed Comparison</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {banks.map((b: any, i: number) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '22px 1fr auto auto auto',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 10,
                border: i === 0 ? '1.5px solid #22C55E44' : '1px solid var(--border-subtle)',
                background: i === 0 ? 'rgba(34,197,94,0.04)' : 'var(--bg-primary)',
              }}
            >
              {/* Rank badge */}
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: i === 0 ? '#22C55E' : 'var(--text-muted)',
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: i === 0 ? 'rgba(34,197,94,0.15)' : 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>#{i + 1}</span>

              {/* Bank name & type */}
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {b.bank}
                  {i === 0 && <span style={{ fontSize: 9, fontWeight: 800, background: '#22C55E', color: '#000', padding: '1px 6px', borderRadius: 10 }}>LOWEST</span>}
                  <span style={{ fontSize: 9, fontWeight: 600, color: BANK_TYPE_COLOR[b.bank_type] || '#6B7280', background: `${BANK_TYPE_COLOR[b.bank_type]}22`, padding: '1px 5px', borderRadius: 6 }}>{b.bank_type}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Processing Fee: {b.processing_fee_pct}%</div>
              </div>

              {/* Rate */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: i === 0 ? '#22C55E' : 'var(--text-primary)' }}>{b.rate_min}%</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>to {b.rate_max}%</div>
              </div>

              {/* EMI */}
              {b.emi_estimate ? (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>{formatCurrency(b.emi_estimate)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ month</div>
                </div>
              ) : <div />}

              {/* Source */}
              {b.source_url && (
                <a href={b.source_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  View ↗
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
          ⚠️ Rates are indicative and as of Dec 2024. Actual rate depends on credit score, loan amount, and bank policy. Verify directly with the bank before applying.
        </p>
      </div>
    </div>
  );
}
