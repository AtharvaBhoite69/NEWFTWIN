import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function InvestPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [userInvestments, setUserInvestments] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getInvestmentProducts(), api.getInvestments(), api.getSnapshot()]).then(([prods, inv, snap]) => {
      if (prods.success) setProducts(prods.data);
      if (inv.success) setUserInvestments(inv.data);
      if (snap.success) setSnapshot(snap.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  const canInvest = snapshot && snapshot.investmentCapacity > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
          Investments & Wealth Engine
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Surplus-aware investment guidance tailored to your risk appetite and Indian tax regulations.
        </p>
      </div>

      {/* Free Investment Capacity */}
      {snapshot && (
        <div
          className="card"
          style={{
            marginBottom: 32,
            padding: 24,
            borderLeft: `4px solid ${canInvest ? 'var(--success)' : 'var(--warning)'}`,
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>AVAILABLE INVESTMENT CAPACITY</p>
              <p className="financial-number" style={{ fontSize: 28, color: canInvest ? 'var(--success)' : 'var(--warning)', margin: 0 }}>
                {formatCurrency(snapshot.investmentCapacity)}
                <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}> / month</span>
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '6px 0 0' }}>
                {canInvest
                  ? `Computed from your ₹${Math.round(snapshot.monthlySurplus).toLocaleString('en-IN')} surplus minus debt/EMI requirements.`
                  : "Your current outflow consumes your monthly surplus. Focus on building an emergency reserve before starting new investments."}
              </p>
            </div>
            <Link to="/simulator" className="btn-secondary" style={{ fontSize: 13 }}>
              Simulate Growth →
            </Link>
          </div>
        </div>
      )}

      {/* User's Active Investments */}
      {userInvestments.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Your Active Portfolio</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {userInvestments.map((inv: any) => {
              const returns = inv.current_value - inv.invested_amount;
              return (
                <div key={inv.id} className="card" style={{ padding: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{inv.type}</p>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 12px' }}>{inv.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>INVESTED</p>
                      <p className="financial-number" style={{ fontSize: 15, margin: 0 }}>{formatCurrency(inv.invested_amount)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>CURRENT VALUE</p>
                      <p className="financial-number" style={{ fontSize: 15, color: returns >= 0 ? 'var(--success)' : 'var(--danger)', margin: 0 }}>
                        {formatCurrency(inv.current_value)}
                      </p>
                    </div>
                  </div>
                  {inv.monthly_contribution > 0 && (
                    <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12, marginBottom: 0, fontWeight: 600 }}>
                      Monthly SIP: {formatCurrency(inv.monthly_contribution)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Investment Products Catalog */}
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Indian Investment Products</h2>
      <div style={{ display: 'grid', gap: 16 }}>
        {products.map((prod: any, i: number) => (
          <motion.div key={prod.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <span className="tag-low" style={{ marginBottom: 6, display: 'inline-block' }}>{prod.type}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0' }}>{prod.name}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{prod.description}</p>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>RISK</p>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>{prod.risk_level}</p>
                </div>
                <div style={{ textAlign: 'center', padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>EST. RETURN</p>
                  <p className="financial-number" style={{ fontSize: 13, color: 'var(--accent)', margin: 0 }}>
                    {prod.expected_return_min}–{prod.expected_return_max}%
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>LIQUIDITY</p>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, textTransform: 'capitalize' }}>{prod.liquidity}</p>
                </div>
              </div>
            </div>

            {prod.tax_info && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                🏛️ <strong>Taxation:</strong> {prod.tax_info}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
