import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'framer-motion';
import { User, Wallet, TrendingUp, CreditCard, Plus, Trash2, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [income, setIncome] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [editProfile, setEditProfile] = useState({ name: '', city: '', employer: '', employmentType: '', maritalStatus: '', dependents: 0, riskPreference: '' });

  const [showAddIncome, setShowAddIncome] = useState(false);
  const [addIncome, setAddIncome] = useState({ name: '', amount: '', type: 'salary', frequency: 'monthly' });
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addExpense, setAddExpense] = useState({ name: '', amount: '', frequency: 'monthly' });
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [addLoan, setAddLoan] = useState({ name: '', emi: '', type: 'other', principal: '', interestRate: '', tenureMonths: '' });

  useEffect(() => {
    async function load() {
      const [p, i, e, l] = await Promise.all([api.getProfile(), api.getIncome(), api.getExpenses(), api.getLoans()]);
      if (p.success) {
        setProfile(p.data);
        setEditProfile({ name: p.data.name || '', city: p.data.city || '', employer: p.data.employer || '', employmentType: p.data.employment_type || '', maritalStatus: p.data.marital_status || '', dependents: p.data.dependents || 0, riskPreference: p.data.risk_preference || '' });
      }
      if (i.success) setIncome(i.data);
      if (e.success) setExpenses(e.data);
      if (l.success) setLoans(l.data);
      setLoading(false);
    }
    load();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    await api.updateProfile(editProfile);
    setSaving(false);
  };

  const handleAddIncome = async () => {
    if (!addIncome.name || !addIncome.amount) return;
    await api.addIncome({ name: addIncome.name, amount: parseFloat(addIncome.amount), type: addIncome.type, frequency: addIncome.frequency, isPrimary: income.length === 0 });
    const res = await api.getIncome();
    if (res.success) setIncome(res.data);
    setShowAddIncome(false);
    setAddIncome({ name: '', amount: '', type: 'salary', frequency: 'monthly' });
  };

  const handleDeleteIncome = async (id: number) => {
    await api.deleteIncome(id);
    const res = await api.getIncome();
    if (res.success) setIncome(res.data);
  };

  const handleAddExpense = async () => {
    if (!addExpense.name || !addExpense.amount) return;
    await api.addExpense({ name: addExpense.name, amount: parseFloat(addExpense.amount), frequency: addExpense.frequency });
    const res = await api.getExpenses();
    if (res.success) setExpenses(res.data);
    setShowAddExpense(false);
    setAddExpense({ name: '', amount: '', frequency: 'monthly' });
  };

  const handleDeleteExpense = async (id: number) => {
    await api.deleteExpense(id);
    const res = await api.getExpenses();
    if (res.success) setExpenses(res.data);
  };

  const handleAddLoan = async () => {
    if (!addLoan.name || !addLoan.emi) return;
    await api.addLoan({ name: addLoan.name, emi: parseFloat(addLoan.emi), type: addLoan.type, principal: parseFloat(addLoan.principal) || 0, interestRate: parseFloat(addLoan.interestRate) || 10, tenureMonths: parseInt(addLoan.tenureMonths) || 12 });
    const res = await api.getLoans();
    if (res.success) setLoans(res.data);
    setShowAddLoan(false);
    setAddLoan({ name: '', emi: '', type: 'other', principal: '', interestRate: '', tenureMonths: '' });
  };

  const handleDeleteLoan = async (id: number) => {
    await api.deleteLoan(id);
    const res = await api.getLoans();
    if (res.success) setLoans(res.data);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'income', label: 'Income Sources', icon: Wallet },
    { key: 'expenses', label: 'Expenses', icon: TrendingUp },
    { key: 'loans', label: 'Loans & EMIs', icon: CreditCard },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
          Financial Profile & Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your baseline data that powers the Financial Twin calculation engine.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn-primary' : 'btn-secondary'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Profile Form */}
      {tab === 'profile' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Personal Demographics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>NAME</label><input className="input" value={editProfile.name} onChange={e => setEditProfile(p => ({ ...p, name: e.target.value }))} /></div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>EMAIL</label><input className="input" value={user?.email || ''} disabled style={{ opacity: 0.7 }} /></div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>CITY</label><input className="input" value={editProfile.city} onChange={e => setEditProfile(p => ({ ...p, city: e.target.value }))} /></div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>EMPLOYER</label><input className="input" value={editProfile.employer} onChange={e => setEditProfile(p => ({ ...p, employer: e.target.value }))} /></div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>EMPLOYMENT TYPE</label>
              <select className="input" value={editProfile.employmentType} onChange={e => setEditProfile(p => ({ ...p, employmentType: e.target.value }))}>
                <option value="salaried">Salaried</option><option value="self_employed">Self Employed</option><option value="freelancer">Freelancer</option>
                <option value="student">Student</option><option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>MARITAL STATUS</label>
              <select className="input" value={editProfile.maritalStatus} onChange={e => setEditProfile(p => ({ ...p, maritalStatus: e.target.value }))}>
                <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
              </select>
            </div>
            <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>DEPENDENTS</label><input className="input" type="number" value={editProfile.dependents} onChange={e => setEditProfile(p => ({ ...p, dependents: parseInt(e.target.value) || 0 }))} /></div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>RISK PREFERENCE</label>
              <select className="input" value={editProfile.riskPreference} onChange={e => setEditProfile(p => ({ ...p, riskPreference: e.target.value }))}>
                <option value="conservative">Conservative</option><option value="moderate">Moderate</option><option value="aggressive">Aggressive</option>
              </select>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-accent" style={{ marginTop: 24 }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}

      {/* Income Sources */}
      {tab === 'income' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Income Streams</h3>
            <button onClick={() => setShowAddIncome(true)} className="btn-accent" style={{ fontSize: 13, padding: '8px 16px' }}><Plus size={14} /> Add Stream</button>
          </div>

          {showAddIncome && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: 16, padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>STREAM NAME</label><input className="input" value={addIncome.name} onChange={e => setAddIncome(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Salary" /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>MONTHLY AMOUNT (₹)</label><input className="input" type="number" value={addIncome.amount} onChange={e => setAddIncome(p => ({ ...p, amount: e.target.value }))} placeholder="85000" /></div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>TYPE</label>
                  <select className="input" value={addIncome.type} onChange={e => setAddIncome(p => ({ ...p, type: e.target.value }))}>
                    <option value="salary">Salary</option><option value="freelance">Freelance</option><option value="rental">Rental</option><option value="investment">Investment</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={handleAddIncome} className="btn-accent" style={{ fontSize: 13, padding: '6px 16px' }}>Save</button>
                <button onClick={() => setShowAddIncome(false)} className="btn-secondary" style={{ fontSize: 13, padding: '6px 16px' }}>Cancel</button>
              </div>
            </motion.div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {income.map(i => (
              <div key={i.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>{i.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{i.type} • {i.frequency}{i.is_primary ? ' • Primary' : ''}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span className="financial-number" style={{ fontSize: 18, color: 'var(--success)' }}>{formatCurrency(i.amount)}</span>
                  <button onClick={() => handleDeleteIncome(i.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses */}
      {tab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Monthly Expenses</h3>
            <button onClick={() => setShowAddExpense(true)} className="btn-accent" style={{ fontSize: 13, padding: '8px 16px' }}><Plus size={14} /> Add Outflow</button>
          </div>

          {showAddExpense && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: 16, padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>EXPENSE NAME</label><input className="input" value={addExpense.name} onChange={e => setAddExpense(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Rent" /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>MONTHLY AMOUNT (₹)</label><input className="input" type="number" value={addExpense.amount} onChange={e => setAddExpense(p => ({ ...p, amount: e.target.value }))} placeholder="25000" /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={handleAddExpense} className="btn-accent" style={{ fontSize: 13, padding: '6px 16px' }}>Save</button>
                <button onClick={() => setShowAddExpense(false)} className="btn-secondary" style={{ fontSize: 13, padding: '6px 16px' }}>Cancel</button>
              </div>
            </motion.div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {expenses.map(e => (
              <div key={e.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{e.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{e.category_name || 'General'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span className="financial-number" style={{ fontSize: 16 }}>{formatCurrency(e.amount)}</span>
                  <button onClick={() => handleDeleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loans */}
      {tab === 'loans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Loans & EMIs</h3>
            <button onClick={() => setShowAddLoan(true)} className="btn-accent" style={{ fontSize: 13, padding: '8px 16px' }}><Plus size={14} /> Add Loan</button>
          </div>

          {showAddLoan && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: 16, padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>LOAN NAME</label><input className="input" value={addLoan.name} onChange={e => setAddLoan(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Home Loan" /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>MONTHLY EMI (₹)</label><input className="input" type="number" value={addLoan.emi} onChange={e => setAddLoan(p => ({ ...p, emi: e.target.value }))} placeholder="35000" /></div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>TYPE</label>
                  <select className="input" value={addLoan.type} onChange={e => setAddLoan(p => ({ ...p, type: e.target.value }))}>
                    <option value="home">Home Loan</option><option value="car">Car Loan</option><option value="personal">Personal Loan</option><option value="education">Education Loan</option><option value="other">Other</option>
                  </select>
                </div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>PRINCIPAL (₹)</label><input className="input" type="number" value={addLoan.principal} onChange={e => setAddLoan(p => ({ ...p, principal: e.target.value }))} placeholder="4000000" /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>INTEREST RATE (%)</label><input className="input" type="number" value={addLoan.interestRate} onChange={e => setAddLoan(p => ({ ...p, interestRate: e.target.value }))} placeholder="8.5" /></div>
                <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>REMAINING MONTHS</label><input className="input" type="number" value={addLoan.tenureMonths} onChange={e => setAddLoan(p => ({ ...p, tenureMonths: e.target.value }))} placeholder="180" /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={handleAddLoan} className="btn-accent" style={{ fontSize: 13, padding: '6px 16px' }}>Save</button>
                <button onClick={() => setShowAddLoan(false)} className="btn-secondary" style={{ fontSize: 13, padding: '6px 16px' }}>Cancel</button>
              </div>
            </motion.div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {loans.map(l => (
              <div key={l.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, textTransform: 'uppercase' }}>{l.type} LOAN • {l.interest_rate}% p.a.</span>
                    <h4 style={{ fontSize: 17, fontWeight: 700, margin: '2px 0 0' }}>{l.name}</h4>
                  </div>
                  <button onClick={() => handleDeleteLoan(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>MONTHLY EMI</p><p className="financial-number" style={{ fontSize: 16, color: 'var(--danger)', margin: 0 }}>{formatCurrency(l.emi)}</p></div>
                  <div><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>OUTSTANDING</p><p className="financial-number" style={{ fontSize: 16, margin: 0 }}>{formatCurrency(l.outstanding_amount)}</p></div>
                  <div><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>REMAINING</p><p className="financial-number" style={{ fontSize: 16, margin: 0 }}>{l.remaining_tenure_months} Months</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
