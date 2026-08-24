import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

const steps = ['Personal', 'Employment', 'Income', 'Expenses', 'Goals', 'Complete'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    gender: '', maritalStatus: 'single', dependents: 0, city: '',
    employmentType: 'salaried', employer: '',
    salary: '', otherIncome: '',
    rent: '', food: '', transport: '', bills: '', other: '',
    goalType: '', goalAmount: '', goalDate: '',
    riskPreference: 'moderate',
  });

  const update = (field: string, value: any) => setData(prev => ({ ...prev, [field]: value }));

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

      if (data.salary) {
        await api.addIncome({ type: 'salary', name: 'Monthly Salary', amount: parseFloat(data.salary), frequency: 'monthly', isPrimary: true });
      }
      if (data.otherIncome) {
        await api.addIncome({ type: 'other', name: 'Other Income', amount: parseFloat(data.otherIncome), frequency: 'monthly', isPrimary: false });
      }

      const categories = await api.getExpenseCategories();
      const catMap: Record<string, number> = {};
      if (categories.success) {
        categories.data.forEach((c: any) => { catMap[c.name] = c.id; });
      }

      if (data.rent) await api.addExpense({ categoryId: catMap['Housing'], name: 'Rent', amount: parseFloat(data.rent), frequency: 'monthly', isMandatory: true });
      if (data.food) await api.addExpense({ categoryId: catMap['Food & Dining'], name: 'Food & Dining', amount: parseFloat(data.food), frequency: 'monthly', isMandatory: true });
      if (data.transport) await api.addExpense({ categoryId: catMap['Transport'], name: 'Transport', amount: parseFloat(data.transport), frequency: 'monthly', isMandatory: false });
      if (data.bills) await api.addExpense({ categoryId: catMap['Bills & Utilities'], name: 'Bills & Utilities', amount: parseFloat(data.bills), frequency: 'monthly', isMandatory: true });
      if (data.other) await api.addExpense({ categoryId: catMap['Other'], name: 'Other Expenses', amount: parseFloat(data.other), frequency: 'monthly', isMandatory: false });

      if (data.goalType && data.goalAmount) {
        const targetDate = data.goalDate || new Date(Date.now() + 2 * 365 * 86400000).toISOString().split('T')[0];
        await api.createGoal({
          name: data.goalType.charAt(0).toUpperCase() + data.goalType.slice(1),
          type: data.goalType,
          targetAmount: parseFloat(data.goalAmount),
          targetDate,
        });
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Tell us about yourself</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>This helps us personalize your Financial Twin</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Gender</label>
                <select className="input" value={data.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Marital Status</label>
                <select className="input" value={data.maritalStatus} onChange={e => update('maritalStatus', e.target.value)}>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Dependents</label>
                <input type="number" className="input" value={data.dependents} onChange={e => update('dependents', parseInt(e.target.value) || 0)} min="0" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>City</label>
                <input className="input" value={data.city} onChange={e => update('city', e.target.value)} placeholder="Mumbai, Delhi, Bangalore..." />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Your employment</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Understanding your income source</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Employment Type</label>
                <select className="input" value={data.employmentType} onChange={e => update('employmentType', e.target.value)}>
                  <option value="salaried">Salaried</option>
                  <option value="self_employed">Self Employed</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="business_owner">Business Owner</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                  <option value="unemployed">Unemployed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Employer / Company</label>
                <input className="input" value={data.employer} onChange={e => update('employer', e.target.value)} placeholder="Company name (optional)" />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Your income</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Monthly take-home income</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Monthly Salary / Primary Income (₹)</label>
                <input type="number" className="input" value={data.salary} onChange={e => update('salary', e.target.value)} placeholder="e.g., 80000" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Other Monthly Income (₹)</label>
                <input type="number" className="input" value={data.otherIncome} onChange={e => update('otherIncome', e.target.value)} placeholder="e.g., 10000 (optional)" />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Your monthly expenses</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Approximate monthly spending</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Rent / Housing (₹)</label>
                <input type="number" className="input" value={data.rent} onChange={e => update('rent', e.target.value)} placeholder="e.g., 15000" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Food & Dining (₹)</label>
                <input type="number" className="input" value={data.food} onChange={e => update('food', e.target.value)} placeholder="e.g., 8000" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Transport (₹)</label>
                <input type="number" className="input" value={data.transport} onChange={e => update('transport', e.target.value)} placeholder="e.g., 3000" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Bills & Utilities (₹)</label>
                <input type="number" className="input" value={data.bills} onChange={e => update('bills', e.target.value)} placeholder="e.g., 5000" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Other Expenses (₹)</label>
                <input type="number" className="input" value={data.other} onChange={e => update('other', e.target.value)} placeholder="e.g., 5000" />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Your first financial goal</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>What are you working toward? (optional)</p>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Goal Type</label>
                <select className="input" value={data.goalType} onChange={e => update('goalType', e.target.value)}>
                  <option value="">Skip this step</option>
                  <option value="emergency_fund">Emergency Fund</option>
                  <option value="marriage">Marriage</option>
                  <option value="car">Car Purchase</option>
                  <option value="house">House Purchase</option>
                  <option value="education">Education</option>
                  <option value="travel">Travel</option>
                  <option value="retirement">Retirement</option>
                  <option value="custom">Other Goal</option>
                </select>
              </div>
              {data.goalType && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Target Amount (₹)</label>
                    <input type="number" className="input" value={data.goalAmount} onChange={e => update('goalAmount', e.target.value)} placeholder="e.g., 500000" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Target Date</label>
                    <input type="date" className="input" value={data.goalDate} onChange={e => update('goalDate', e.target.value)} />
                  </div>
                </>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Risk Preference</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['conservative', 'moderate', 'aggressive'].map(risk => (
                    <button
                      key={risk}
                      type="button"
                      onClick={() => update('riskPreference', risk)}
                      style={{
                        flex: 1, padding: '12px 8px', borderRadius: 12,
                        border: `2px solid ${data.riskPreference === risk ? 'var(--accent)' : 'var(--border)'}`,
                        background: data.riskPreference === risk ? 'var(--accent-subtle)' : 'transparent',
                        color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                        textTransform: 'capitalize',
                      }}
                    >
                      {risk === 'conservative' ? '🛡️' : risk === 'moderate' ? '⚖️' : '🚀'} {risk}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#22C55E20', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Check size={32} color="#22C55E" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Your Financial Twin is ready!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
              We've created a personalized financial model based on your information. You can always update it from your profile or by chatting with FTWIN.
            </p>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-primary)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 40 }}>
          {steps.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        <div className="card">
          {renderStep()}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            {step > 0 && step < 5 && (
              <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              {step < 4 && (
                <button className="btn-primary" onClick={() => setStep(step + 1)}>
                  Continue <ArrowRight size={16} />
                </button>
              )}
              {step === 4 && (
                <button className="btn-accent" onClick={() => { setStep(5); handleComplete(); }} disabled={loading}>
                  {loading ? 'Building your Twin...' : 'Build My Twin'} <ArrowRight size={16} />
                </button>
              )}
              {step === 5 && (
                <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
