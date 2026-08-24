import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Landmark, Plus, Trash2, X } from 'lucide-react';

export default function BankPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ bankName: '', accountType: 'savings', balance: '' });

  const load = () => api.getBankAccounts().then(r => { if (r.success) setAccounts(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.bankName) return;
    await api.addBankAccount({ bankName: form.bankName, accountType: form.accountType, balance: parseFloat(form.balance) || 0 });
    setForm({ bankName: '', accountType: 'savings', balance: '' });
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id: number) => { await api.deleteBankAccount(id); load(); };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum: number, a: any) => sum + (parseFloat(a.balance) || 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
            Bank Accounts & Liquid Cash
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track liquid cash and bank deposits that power your emergency fund calculations.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-accent">
          <Plus size={16} /> Add Bank Account
        </button>
      </div>

      {/* Aggregate Balance */}
      <div className="card" style={{ marginBottom: 24, padding: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>TOTAL LIQUID BALANCE</p>
        <p className="financial-number" style={{ fontSize: 28, color: 'var(--accent)', margin: 0 }}>
          {formatCurrency(totalBalance)}
        </p>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: 20, padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>BANK NAME</label><input className="input" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} placeholder="SBI, HDFC, ICICI..." /></div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>ACCOUNT TYPE</label>
              <select className="input" value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))}>
                <option value="savings">Savings Account</option><option value="current">Current Account</option><option value="salary">Salary Account</option><option value="fd">Fixed Deposit</option>
              </select>
            </div>
            <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>CURRENT BALANCE (₹)</label><input className="input" type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="150000" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleAdd} className="btn-accent" style={{ fontSize: 13, padding: '6px 16px' }}>Save</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ fontSize: 13, padding: '6px 16px' }}>Cancel</button>
          </div>
        </motion.div>
      )}

      {accounts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Landmark size={40} style={{ color: 'var(--accent)', opacity: 0.5, marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, marginBottom: 4 }}>No Bank Accounts Added</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Add your bank balances to compute accurate emergency fund months.</p>
          <button onClick={() => setShowAdd(true)} className="btn-accent">Add Bank Account</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {accounts.map((acc, i) => (
            <motion.div key={acc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Landmark size={20} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>{acc.bank_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'capitalize' }}>{acc.account_type} Account</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span className="financial-number" style={{ fontSize: 18 }}>{formatCurrency(acc.balance)}</span>
                <button onClick={() => handleDelete(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
