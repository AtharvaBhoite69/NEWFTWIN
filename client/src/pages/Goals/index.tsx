import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatCurrency, getStatusLabel, getStatusColor, getGoalTypeLabel } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Target, Plus, X, Trash2 } from 'lucide-react';

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'custom', targetAmount: '', currentAmount: '', targetDate: '', monthlyContribution: '', priority: 'medium' });

  const loadGoals = () => api.getGoals().then(r => { if (r.success) setGoals(r.data); setLoading(false); });

  useEffect(() => { loadGoals(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.targetAmount) return;
    await api.createGoal({
      name: form.name,
      type: form.type,
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount) || 0,
      targetDate: form.targetDate || new Date(Date.now() + 2 * 365 * 86400000).toISOString().split('T')[0],
      monthlyContribution: parseFloat(form.monthlyContribution) || 0,
      priority: form.priority,
    });
    setForm({ name: '', type: 'custom', targetAmount: '', currentAmount: '', targetDate: '', monthlyContribution: '', priority: 'medium' });
    setShowCreate(false);
    loadGoals();
  };

  const handleDelete = async (id: number) => {
    await api.deleteGoal(id);
    loadGoals();
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
            Financial Goals
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track progress and simulate realistic timelines toward your major life milestones.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-accent">
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {/* Create Modal Drawer */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: 32, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Create Financial Goal</h3>
            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>GOAL NAME</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dream House" /></div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>CATEGORY</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="marriage">Marriage</option><option value="house">House</option><option value="car">Car</option><option value="education">Education</option>
                <option value="travel">Travel</option><option value="emergency_fund">Emergency Fund</option><option value="retirement">Retirement</option><option value="custom">Custom</option>
              </select>
            </div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>TARGET AMOUNT (₹)</label><input className="input" type="number" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="2500000" /></div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>CURRENT SAVED (₹)</label><input className="input" type="number" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} placeholder="200000" /></div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>TARGET DATE</label><input className="input" type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} /></div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>MONTHLY SIP ALLOCATION (₹)</label><input className="input" type="number" value={form.monthlyContribution} onChange={e => setForm(f => ({ ...f, monthlyContribution: e.target.value }))} placeholder="15000" /></div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>PRIORITY</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={handleCreate} className="btn-accent">Save Goal</button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Target size={40} style={{ color: 'var(--accent)', opacity: 0.5, marginBottom: 12 }} />
          <h3 style={{ fontSize: 20, marginBottom: 6 }}>No Active Goals</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Create a goal to calculate your monthly required contribution.</p>
          <button onClick={() => setShowCreate(true)} className="btn-accent">Create First Goal</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {goals.map((goal, i) => {
            const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            const cs = goal.calculatedStatus;
            const status = cs?.status || goal.status;
            const statusColor = getStatusColor(status);

            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{getGoalTypeLabel(goal.type)}</span>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0' }}>{goal.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-secondary)' }}>
                      {getStatusLabel(status)}
                    </span>
                    <button onClick={() => handleDelete(goal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>TARGET</p><p className="financial-number" style={{ fontSize: 16, margin: 0 }}>{formatCurrency(goal.target_amount)}</p></div>
                  <div><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>CURRENT</p><p className="financial-number" style={{ fontSize: 16, color: 'var(--accent)', margin: 0 }}>{formatCurrency(goal.current_amount)}</p></div>
                  <div><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>MONTHLY ALLOCATION</p><p className="financial-number" style={{ fontSize: 16, margin: 0 }}>{formatCurrency(goal.monthly_contribution)}</p></div>
                  {cs?.requiredMonthly > 0 && <div><p style={{ fontSize: 11, color: 'var(--warning)', margin: 0 }}>REQUIRED/MO</p><p className="financial-number" style={{ fontSize: 16, color: 'var(--warning)', margin: 0 }}>{formatCurrency(cs.requiredMonthly)}</p></div>}
                  {cs?.monthsRemaining > 0 && <div><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>TIMELINE</p><p className="financial-number" style={{ fontSize: 16, margin: 0 }}>{cs.monthsRemaining} Months</p></div>}
                </div>

                <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: statusColor, width: `${Math.min(progress, 100)}%`, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  <span>{Math.round(progress)}% Completed</span>
                  <span>Target Date: {goal.target_date}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
