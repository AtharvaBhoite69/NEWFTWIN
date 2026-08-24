import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import {
  ArrowRight, ArrowLeft, User, Briefcase, TrendingUp, PiggyBank,
  CreditCard, Target, Shield, Sparkles, Check, ChevronDown
} from 'lucide-react';

/* ── Step Metadata ─────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'About You',            icon: User,        hint: 'Personal details' },
  { id: 2, label: 'Income',               icon: Briefcase,   hint: 'Your earnings' },
  { id: 3, label: 'Spending',             icon: CreditCard,  hint: 'Monthly outflows' },
  { id: 4, label: 'Savings & Investments',icon: PiggyBank,   hint: 'What you build' },
  { id: 5, label: 'Loans',                icon: TrendingUp,  hint: 'Existing debt' },
  { id: 6, label: 'Goals',                icon: Target,      hint: 'What you want' },
  { id: 7, label: 'Risk & Preferences',   icon: Shield,      hint: 'Your comfort zone' },
  { id: 8, label: 'Your Financial Twin',  icon: Sparkles,    hint: 'All set!' },
];

/* ── Shared input helper ───────────────────────────────────────── */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
      {label}
    </label>
    {children}
  </div>
);

const chipStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '11px 10px',
  borderRadius: 10,
  border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  background: active ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
  color: active ? 'var(--accent)' : 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'center' as const,
  transition: 'all 0.18s ease',
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--border)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.18s ease',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238A8A8A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 36,
  cursor: 'pointer',
};

/* ── Initial form data ─────────────────────────────────────────── */
const initData = {
  // About You
  gender: '', maritalStatus: 'single', dependents: 0, city: '', age: '', employmentType: 'salaried', employer: '',
  // Income
  salary: '', otherIncome: '', freelanceIncome: '', rentalIncome: '',
  // Spending
  rent: '', food: '', transport: '', bills: '', entertainment: '', healthcare: '', other: '',
  // Savings & Investments
  currentSavings: '', monthlyInvestment: '', investmentTypes: [] as string[],
  // Loans
  hasLoans: 'no', homeLoan: '', carLoan: '', personalLoan: '', eduLoan: '', otherLoan: '',
  // Goals
  goalType: '', goalName: '', goalAmount: '', goalDate: '',
  // Risk & Preferences
  riskPreference: 'moderate', currency: 'INR', notifications: 'yes',
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0-indexed (0 = step 1)
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(initData);
  const [done, setDone] = useState(false);

  const update = (field: string, value: any) => setData(prev => ({ ...prev, [field]: value }));

  const toggleInvestmentType = (type: string) => {
    const cur = data.investmentTypes;
    update('investmentTypes', cur.includes(type) ? cur.filter(t => t !== type) : [...cur, type]);
  };

  /* ── Final Submit ─────────────────────────────────────────────── */
  const handleComplete = async () => {
    setLoading(true);
    try {
      await api.updateProfile({
        gender: data.gender || undefined,
        maritalStatus: data.maritalStatus,
        dependents: data.dependents,
        city: data.city || undefined,
        employmentType: data.employmentType,
        employer: data.employer || undefined,
        riskPreference: data.riskPreference,
        onboardingCompleted: true,
      });

      // Income
      if (data.salary)        await api.addIncome({ type: 'salary',    name: 'Monthly Salary',       amount: parseFloat(data.salary),        frequency: 'monthly', isPrimary: true });
      if (data.otherIncome)   await api.addIncome({ type: 'other',     name: 'Other Income',         amount: parseFloat(data.otherIncome),   frequency: 'monthly', isPrimary: false });
      if (data.freelanceIncome) await api.addIncome({ type: 'freelance', name: 'Freelance Income',   amount: parseFloat(data.freelanceIncome), frequency: 'monthly', isPrimary: false });
      if (data.rentalIncome)  await api.addIncome({ type: 'rental',    name: 'Rental Income',        amount: parseFloat(data.rentalIncome),  frequency: 'monthly', isPrimary: false });

      // Expenses
      const categories = await api.getExpenseCategories();
      const catMap: Record<string, number> = {};
      if (categories.success) categories.data.forEach((c: any) => { catMap[c.name] = c.id; });

      const addExp = async (cat: string, name: string, val: string, mandatory: boolean) => {
        if (val && parseFloat(val) > 0) await api.addExpense({ categoryId: catMap[cat], name, amount: parseFloat(val), frequency: 'monthly', isMandatory: mandatory });
      };
      await addExp('Housing',        'Rent / Housing',    data.rent,          true);
      await addExp('Food & Dining',  'Food & Dining',     data.food,          true);
      await addExp('Transport',      'Transport',         data.transport,     false);
      await addExp('Bills & Utilities', 'Bills & Utilities', data.bills,      true);
      await addExp('Entertainment',  'Entertainment',     data.entertainment, false);
      await addExp('Healthcare',     'Healthcare',        data.healthcare,    false);
      await addExp('Other',          'Other Expenses',    data.other,         false);

      // Goal
      if (data.goalType && data.goalAmount) {
        const targetDate = data.goalDate || new Date(Date.now() + 2 * 365 * 86400000).toISOString().split('T')[0];
        await api.createGoal({
          name: data.goalName || (data.goalType.charAt(0).toUpperCase() + data.goalType.slice(1)),
          type: data.goalType,
          targetAmount: parseFloat(data.goalAmount),
          targetDate,
        });
      }

      setDone(true);
    } catch (err) {
      console.error('Onboarding error:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Trigger submit when step reaches 7 (step 8) ─────────────── */
  useEffect(() => {
    if (step === 7 && !done && !loading) handleComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ── Step Content ──────────────────────────────────────────────── */
  const renderStep = () => {
    switch (step) {
      /* ── 01 About You ─────────────────────────────────────────── */
      case 0: return (
        <div style={{ display: 'grid', gap: 18 }}>
          <Field label="Age">
            <input type="number" style={inputStyle} value={data.age} onChange={e => update('age', e.target.value)} placeholder="e.g. 28" min="18" max="80" />
          </Field>
          <Field label="Gender">
            <select style={selectStyle} value={data.gender} onChange={e => update('gender', e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <div style={{ display: 'flex', gap: 8 }}>
              {['single', 'married', 'divorced', 'widowed'].map(s => (
                <button key={s} type="button" style={chipStyle(data.maritalStatus === s)} onClick={() => update('maritalStatus', s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Dependents">
              <input type="number" style={inputStyle} value={data.dependents} onChange={e => update('dependents', parseInt(e.target.value) || 0)} min="0" max="10" />
            </Field>
            <Field label="City">
              <input style={inputStyle} value={data.city} onChange={e => update('city', e.target.value)} placeholder="Mumbai, Delhi…" />
            </Field>
          </div>
          <Field label="Employment Type">
            <select style={selectStyle} value={data.employmentType} onChange={e => update('employmentType', e.target.value)}>
              {['salaried', 'self_employed', 'freelancer', 'business_owner', 'student', 'retired', 'unemployed'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </Field>
          <Field label="Company / Employer (optional)">
            <input style={inputStyle} value={data.employer} onChange={e => update('employer', e.target.value)} placeholder="e.g. Infosys, Self" />
          </Field>
        </div>
      );

      /* ── 02 Income ──────────────────────────────────────────── */
      case 1: return (
        <div style={{ display: 'grid', gap: 18 }}>
          <Field label="Monthly Salary / Primary Income (₹)">
            <input type="number" style={inputStyle} value={data.salary} onChange={e => update('salary', e.target.value)} placeholder="e.g. 80,000" />
          </Field>
          <Field label="Freelance / Side Income (₹ / month)">
            <input type="number" style={inputStyle} value={data.freelanceIncome} onChange={e => update('freelanceIncome', e.target.value)} placeholder="e.g. 15,000 (optional)" />
          </Field>
          <Field label="Rental Income (₹ / month)">
            <input type="number" style={inputStyle} value={data.rentalIncome} onChange={e => update('rentalIncome', e.target.value)} placeholder="e.g. 10,000 (optional)" />
          </Field>
          <Field label="Other Income (₹ / month)">
            <input type="number" style={inputStyle} value={data.otherIncome} onChange={e => update('otherIncome', e.target.value)} placeholder="e.g. dividends, gifts (optional)" />
          </Field>
        </div>
      );

      /* ── 03 Spending ────────────────────────────────────────── */
      case 2: return (
        <div style={{ display: 'grid', gap: 18 }}>
          {[
            { label: 'Rent / Housing (₹)', key: 'rent',          placeholder: 'e.g. 15,000' },
            { label: 'Food & Dining (₹)',  key: 'food',          placeholder: 'e.g. 8,000' },
            { label: 'Transport (₹)',      key: 'transport',     placeholder: 'e.g. 3,000' },
            { label: 'Bills & Utilities (₹)', key: 'bills',     placeholder: 'e.g. 5,000' },
            { label: 'Entertainment (₹)', key: 'entertainment', placeholder: 'e.g. 2,000' },
            { label: 'Healthcare (₹)',     key: 'healthcare',    placeholder: 'e.g. 1,500' },
            { label: 'Other Expenses (₹)', key: 'other',        placeholder: 'e.g. 5,000' },
          ].map(({ label, key, placeholder }) => (
            <Field key={key} label={label}>
              <input type="number" style={inputStyle} value={(data as any)[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} />
            </Field>
          ))}
        </div>
      );

      /* ── 04 Savings & Investments ───────────────────────────── */
      case 3: return (
        <div style={{ display: 'grid', gap: 18 }}>
          <Field label="Total Current Savings / Liquid Funds (₹)">
            <input type="number" style={inputStyle} value={data.currentSavings} onChange={e => update('currentSavings', e.target.value)} placeholder="e.g. 2,00,000" />
          </Field>
          <Field label="Monthly Investment Amount (₹)">
            <input type="number" style={inputStyle} value={data.monthlyInvestment} onChange={e => update('monthlyInvestment', e.target.value)} placeholder="e.g. 10,000" />
          </Field>
          <Field label="What do you currently invest in?">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {['Mutual Funds', 'Stocks', 'PPF', 'NPS', 'FD / RD', 'Gold', 'Real Estate', 'Crypto', 'Nothing yet'].map(type => (
                <button key={type} type="button" onClick={() => toggleInvestmentType(type)} style={{
                  padding: '8px 14px', borderRadius: 20,
                  border: `2px solid ${data.investmentTypes.includes(type) ? 'var(--accent)' : 'var(--border)'}`,
                  background: data.investmentTypes.includes(type) ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                  color: data.investmentTypes.includes(type) ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s ease',
                }}>
                  {type}
                </button>
              ))}
            </div>
          </Field>
        </div>
      );

      /* ── 05 Loans ──────────────────────────────────────────── */
      case 4: return (
        <div style={{ display: 'grid', gap: 18 }}>
          <Field label="Do you have any active loans?">
            <div style={{ display: 'flex', gap: 10 }}>
              {['yes', 'no'].map(v => (
                <button key={v} type="button" style={{ ...chipStyle(data.hasLoans === v), flex: 1 }} onClick={() => update('hasLoans', v)}>
                  {v === 'yes' ? '✅ Yes' : '🚫 No, debt-free!'}
                </button>
              ))}
            </div>
          </Field>
          {data.hasLoans === 'yes' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -4 }}>Enter total outstanding balance for each. Leave blank if not applicable.</p>
              {[
                { label: 'Home Loan Outstanding (₹)',     key: 'homeLoan',     placeholder: 'e.g. 30,00,000' },
                { label: 'Car Loan Outstanding (₹)',      key: 'carLoan',      placeholder: 'e.g. 4,00,000' },
                { label: 'Personal Loan Outstanding (₹)',  key: 'personalLoan', placeholder: 'e.g. 1,50,000' },
                { label: 'Education Loan Outstanding (₹)', key: 'eduLoan',     placeholder: 'e.g. 5,00,000' },
                { label: 'Other Loans (₹)',               key: 'otherLoan',    placeholder: 'e.g. 50,000' },
              ].map(({ label, key, placeholder }) => (
                <Field key={key} label={label}>
                  <input type="number" style={inputStyle} value={(data as any)[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} />
                </Field>
              ))}
            </>
          )}
        </div>
      );

      /* ── 06 Goals ─────────────────────────────────────────── */
      case 5: return (
        <div style={{ display: 'grid', gap: 18 }}>
          <Field label="Primary Financial Goal">
            <select style={selectStyle} value={data.goalType} onChange={e => update('goalType', e.target.value)}>
              <option value="">Skip for now</option>
              <option value="emergency_fund">🛡️ Emergency Fund</option>
              <option value="car">🚗 Car Purchase</option>
              <option value="house">🏠 House / Property</option>
              <option value="marriage">💍 Marriage</option>
              <option value="education">🎓 Education / Abroad</option>
              <option value="travel">✈️ Travel / Vacation</option>
              <option value="retirement">🌅 Retirement Corpus</option>
              <option value="startup">🚀 Start a Business</option>
              <option value="custom">🎯 Other Goal</option>
            </select>
          </Field>
          {data.goalType && (
            <>
              <Field label="Goal Name (optional)">
                <input style={inputStyle} value={data.goalName} onChange={e => update('goalName', e.target.value)} placeholder="e.g. Buy a flat in Pune" />
              </Field>
              <Field label="Target Amount (₹)">
                <input type="number" style={inputStyle} value={data.goalAmount} onChange={e => update('goalAmount', e.target.value)} placeholder="e.g. 50,00,000" />
              </Field>
              <Field label="Target Date">
                <input type="date" style={inputStyle} value={data.goalDate} onChange={e => update('goalDate', e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </Field>
            </>
          )}
        </div>
      );

      /* ── 07 Risk & Preferences ──────────────────────────── */
      case 6: return (
        <div style={{ display: 'grid', gap: 24 }}>
          <Field label="Investment Risk Appetite">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4 }}>
              {[
                { value: 'conservative', emoji: '🛡️', title: 'Conservative', desc: 'Prioritise capital safety, FD & PPF' },
                { value: 'moderate',     emoji: '⚖️', title: 'Moderate',    desc: 'Balance of growth & safety, MF SIPs' },
                { value: 'aggressive',   emoji: '🚀', title: 'Aggressive',  desc: 'Maximum growth, stocks & equity' },
              ].map(({ value, emoji, title, desc }) => (
                <button key={value} type="button" onClick={() => update('riskPreference', value)} style={{
                  padding: '16px 12px', borderRadius: 12, textAlign: 'left' as const,
                  border: `2px solid ${data.riskPreference === value ? 'var(--accent)' : 'var(--border)'}`,
                  background: data.riskPreference === value ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                  cursor: 'pointer', transition: 'all 0.18s ease',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: data.riskPreference === value ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Preferred Currency">
            <select style={selectStyle} value={data.currency} onChange={e => update('currency', e.target.value)}>
              <option value="INR">🇮🇳 INR — Indian Rupee</option>
              <option value="USD">🇺🇸 USD — US Dollar</option>
              <option value="EUR">🇪🇺 EUR — Euro</option>
              <option value="GBP">🇬🇧 GBP — British Pound</option>
            </select>
          </Field>
          <Field label="Enable Smart Notifications?">
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ v: 'yes', l: '🔔 Yes, keep me informed' }, { v: 'no', l: '🔕 No thanks' }].map(({ v, l }) => (
                <button key={v} type="button" style={{ ...chipStyle(data.notifications === v), flex: 1 }} onClick={() => update('notifications', v)}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>
      );

      /* ── 08 Your Financial Twin ─────────────────────────── */
      case 7: return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          {loading ? (
            <>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-subtle)', border: '3px solid var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, animation: 'pulse 1.5s infinite' }}>
                <Sparkles size={32} color="var(--accent)" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Building your Financial Twin…</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Crunching your numbers and calibrating your digital model ✨</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#22C55E20', border: '3px solid #22C55E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Check size={36} color="#22C55E" strokeWidth={2.5} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10, letterSpacing: '-0.02em' }}>Your Financial Twin is alive! 🎉</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.7 }}>
                We've built a personalized digital model of your financial life. Explore your dashboard, simulate decisions, and let the AI guide you.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32, textAlign: 'left' }}>
                {[
                  { emoji: '📊', title: 'Health Score', desc: 'Track your financial fitness' },
                  { emoji: '🤖', title: 'AI Advisor',   desc: 'Ask anything, anytime' },
                  { emoji: '🎯', title: 'Goals',        desc: 'Your milestones tracked' },
                ].map(({ emoji, title, desc }) => (
                  <div key={title} style={{ padding: '14px 12px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', textAlign: 'center' as const }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }
  };

  const isLastInputStep = step === 6;
  const isTwinStep = step === 7;
  const totalSteps = STEPS.length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg-primary)' }}>
      {/* ── Sidebar ─────────────────────────────────── */}
      <div style={{
        width: 280, flexShrink: 0, borderRight: '1.5px solid var(--border)',
        padding: '48px 28px', display: 'flex', flexDirection: 'column', gap: 8,
        background: 'var(--bg-secondary)',
      }} className="hide-on-mobile">
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-primary)', fontWeight: 800, fontSize: 15, marginBottom: 12 }}>FT</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Setting up your</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Financial Twin</div>
        </div>

        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: isActive ? 'var(--accent-subtle)' : 'transparent', border: `1.5px solid ${isActive ? 'var(--accent)' : 'transparent'}`, opacity: i > step ? 0.4 : 1, transition: 'all 0.2s ease' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isComplete ? '#22C55E20' : isActive ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }}>
                {isComplete ? <Check size={13} color="#22C55E" strokeWidth={3} /> : <Icon size={13} color={isActive ? 'white' : 'var(--text-muted)'} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--accent)' : isComplete ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {String(i + 1).padStart(2, '0')} {s.label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', left: 46, top: '100%', width: 1, height: 8, background: 'var(--border)' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Main Content ─────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 540 }}>

          {/* Mobile step indicator */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s ease' }} />
            ))}
          </div>

          {/* Step badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '4px 10px', borderRadius: 20, letterSpacing: '0.05em' }}>
              STEP {step + 1} / {totalSteps}
            </div>
          </div>

          {/* Step header */}
          {step < 7 && (
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
                {STEPS[step].label}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                {step === 0 && 'Tell us a little about yourself to personalize your Twin.'}
                {step === 1 && 'All income sources help us build an accurate monthly picture.'}
                {step === 2 && 'Approximate numbers work great — you can always refine later.'}
                {step === 3 && 'What you own and build is a core part of your net worth.'}
                {step === 4 && 'Existing loans shape your debt-to-income ratio and capacity.'}
                {step === 5 && 'Set your first milestone — we\'ll track progress automatically.'}
                {step === 6 && 'Help us understand how you\'d like to grow your money.'}
              </p>
            </div>
          )}

          {/* Step content */}
          <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 18, padding: '28px 28px', boxShadow: 'var(--shadow-md)', marginBottom: 24 }}>
            {renderStep()}
          </div>

          {/* Navigation */}
          {!isTwinStep && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : <div />}

              <button
                onClick={() => setStep(step + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, border: 'none', background: isLastInputStep ? 'var(--accent)' : 'var(--text-primary)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, letterSpacing: '0.01em' }}
              >
                {isLastInputStep ? '🚀 Build My Financial Twin' : 'Continue'}
                {!isLastInputStep && <ArrowRight size={16} />}
              </button>
            </div>
          )}

          {isTwinStep && !loading && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ padding: '14px 36px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 15, letterSpacing: '0.01em', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                Open My Dashboard <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @media (max-width: 768px) { .hide-on-mobile { display: none !important; } }
      `}</style>
    </div>
  );
}
