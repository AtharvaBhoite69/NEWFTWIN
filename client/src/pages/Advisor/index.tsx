import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Shield, Wallet, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdvisorPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    Promise.all([api.getRecommendations(), api.getSnapshot()]).then(([recs, snap]) => {
      if (recs.success) setRecommendations(recs.data);
      if (snap.success) setSnapshot(snap.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  const filteredRecs = filter === 'all'
    ? recommendations
    : recommendations.filter(r => r.priority === filter);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
            Financial Advisor
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Interconnected intelligence derived from your Financial Twin model.
          </p>
        </div>

        <Link to="/chat" className="btn-accent" style={{ padding: '10px 20px', fontSize: 14 }}>
          <Sparkles size={16} /> Chat with Advisor
        </Link>
      </div>

      {/* Telemetry Strip */}
      {snapshot && snapshot.totalMonthlyIncome > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>MONTHLY SURPLUS</p>
            <p className="financial-number" style={{ fontSize: 20, color: snapshot.monthlySurplus >= 0 ? 'var(--info)' : 'var(--danger)', margin: 0 }}>
              {formatCurrency(snapshot.monthlySurplus)}
            </p>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>INVESTMENT CAPACITY</p>
            <p className="financial-number" style={{ fontSize: 20, color: 'var(--accent)', margin: 0 }}>
              {formatCurrency(snapshot.investmentCapacity)}
            </p>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>SAVINGS RATE</p>
            <p className="financial-number" style={{ fontSize: 20, color: 'var(--success)', margin: 0 }}>
              {snapshot.savingsRate}%
            </p>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>DEBT-TO-INCOME</p>
            <p className="financial-number" style={{ fontSize: 20, color: snapshot.debtToIncomeRatio > 40 ? 'var(--danger)' : 'var(--text-primary)', margin: 0 }}>
              {snapshot.debtToIncomeRatio}%
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {(['all', 'high', 'medium', 'low'] as const).map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={filter === p ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 16px', fontSize: 13, textTransform: 'capitalize' }}
          >
            {p === 'all' ? `All (${recommendations.length})` : `${p} Priority`}
          </button>
        ))}
      </div>

      {/* Recommendations Cards */}
      {filteredRecs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <CheckCircle size={36} color="var(--success)" style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>No Recommendations Found</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Your financial metrics look solid for this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filteredRecs.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
              style={{ padding: 22 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className={`tag-${rec.priority}`}>{rec.priority} Priority</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{rec.type}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{rec.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px' }}>{rec.description}</p>
              {rec.reason && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                  <strong>Reason:</strong> {rec.reason}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
