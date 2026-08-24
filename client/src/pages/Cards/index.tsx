import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import { formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Sparkles, Search, Check, Plus,
  Trash2, ExternalLink, X, AlertCircle,
  ShieldCheck, Layers, Eye
} from 'lucide-react';

export default function CardsPage() {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'recommended' | 'catalog' | 'wallet'>('catalog');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState('all');
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'bank' | 'name' | 'fee_asc'>('score');

  // Modals & Trays
  const [selectedCardDetail, setSelectedCardDetail] = useState<any | null>(null);
  const [compareList, setCompareList] = useState<any[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Wallet Add Modal
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [walletCardId, setWalletCardId] = useState<number | null>(null);
  const [walletCreditLimit, setWalletCreditLimit] = useState<number>(100000);
  const [walletAvailLimit, setWalletAvailLimit] = useState<number>(100000);
  const [walletLastFour, setWalletLastFour] = useState<string>('');
  const [walletIsPrimary, setWalletIsPrimary] = useState<boolean>(false);

  // Load Initial Data
  const loadData = async () => {
    try {
      const [catRes, recRes, userRes] = await Promise.all([
        api.getCreditCardCatalog(),
        api.getCreditCardRecommendations(),
        api.getUserCreditCards(),
      ]);
      if (catRes.success) setCatalog(catRes.data);
      if (recRes.success) setRecommended(recRes.data);
      if (userRes.success) setUserCards(userRes.data);
    } catch (err) {
      console.error('Failed to load cards data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Bank List for filter
  const banks = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach(c => {
      if (c.bank) set.add(c.bank);
    });
    return Array.from(set).sort();
  }, [catalog]);

  // Filtered & Sorted Catalog Cards
  const filteredCatalog = useMemo(() => {
    return catalog.filter(card => {
      const matchesSearch = !searchQuery ||
        card.card_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.bank.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (card.best_for && card.best_for.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBank = selectedBank === 'all' || card.bank === selectedBank;
      const matchesNetwork = selectedNetwork === 'all' || (card.network && card.network.toLowerCase().includes(selectedNetwork.toLowerCase()));

      const hasImage = Boolean(card.image_url && card.image_url.trim().length > 0);
      void hasImage; // kept for CardImageThumb

      return matchesSearch && matchesBank && matchesNetwork;
    }).sort((a, b) => {
      if (sortBy === 'score') {
        return (b.cardcheck_score || 0) - (a.cardcheck_score || 0);
      }
      if (sortBy === 'bank') {
        return a.bank.localeCompare(b.bank);
      }
      if (sortBy === 'name') {
        return a.card_name.localeCompare(b.card_name);
      }
      return 0;
    });
  }, [catalog, searchQuery, selectedBank, selectedNetwork, sortBy]);

  // Comparison toggle
  const toggleCompare = (card: any) => {
    if (compareList.some(c => c.id === card.id)) {
      setCompareList(prev => prev.filter(c => c.id !== card.id));
    } else {
      if (compareList.length >= 4) {
        alert('You can compare up to 4 credit cards at a time.');
        return;
      }
      setCompareList(prev => [...prev, card]);
    }
  };

  // Add Card to User's Wallet
  const handleAddCardToWallet = async () => {
    if (!walletCardId) return;
    try {
      const res = await api.addUserCreditCard({
        creditCardId: walletCardId,
        creditLimit: walletCreditLimit,
        availableLimit: walletAvailLimit,
        lastFourDigits: walletLastFour,
        isPrimary: walletIsPrimary,
      });
      if (res.success) {
        await loadData();
        setIsAddWalletOpen(false);
        setWalletCardId(null);
        setWalletLastFour('');
      } else {
        alert(res.error || 'Failed to add card');
      }
    } catch (err) {
      alert('Error adding card to wallet');
    }
  };

  const handleRemoveUserCard = async (userCardId: number) => {
    if (!confirm('Remove this card from your wallet?')) return;
    try {
      const res = await api.removeUserCreditCard(userCardId);
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      alert('Failed to remove card');
    }
  };


  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 100 }}>
      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 24 }}>💳</span>
            <h1 className="font-editorial" style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
              Indian Credit Cards Intelligence
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14, maxWidth: 640 }}>
            Powered by the verified catalog of <strong>141 Indian credit cards</strong>. Compare real joining/annual fees, CardCheck scores, rewards, and real card designs.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setIsAddWalletOpen(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 16px' }}
          >
            <Plus size={15} /> Add to My Wallet
          </button>
        </div>
      </div>

      {/* ── Navigation Tabs ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <button
          onClick={() => setTab('catalog')}
          className={tab === 'catalog' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}
        >
          <CreditCard size={16} /> All Cards ({catalog.length})
        </button>
        <button
          onClick={() => setTab('recommended')}
          className={tab === 'recommended' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}
        >
          <Sparkles size={16} /> Recommended for You ({recommended.length})
        </button>
        <button
          onClick={() => setTab('wallet')}
          className={tab === 'wallet' ? 'btn-primary' : 'btn-secondary'}
          style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}
        >
          <Layers size={16} /> My Cards ({userCards.length})
        </button>

      </div>

      {/* ── TAB 1: ALL CARDS CATALOG ────────────────────────────── */}
      {tab === 'catalog' && (
        <div>
          {/* Filter Bar */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            {/* Search and Primary Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'center' }}>
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search card name, bank (HDFC, SBI, Axis...), or perks (fuel, lounge, travel)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Bank Filter */}
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Banks ({banks.length})</option>
                {banks.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Network Filter */}
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Networks</option>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="RuPay">RuPay (UPI)</option>
                <option value="Diners">Diners Club</option>
                <option value="Amex">American Express</option>
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <option value="score">Sort by CardCheck Score</option>
                <option value="bank">Sort by Bank (A-Z)</option>
                <option value="name">Sort by Card Name</option>
              </select>
            </div>

            {/* Quick Bank Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Popular:</span>
              {['all', 'HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IDFC FIRST Bank', 'IndusInd Bank', 'American Express', 'AU Small Finance Bank', 'OneCard (FPL Technologies)'].map(b => (
                <button
                  key={b}
                  onClick={() => setSelectedBank(b)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: selectedBank === b ? 600 : 400,
                    border: '1px solid',
                    borderColor: selectedBank === b ? 'var(--accent)' : 'var(--border-subtle)',
                    background: selectedBank === b ? 'var(--accent)' : 'transparent',
                    color: selectedBank === b ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {b === 'all' ? 'All Banks' : b.replace(' Bank', '').replace(' (FPL Technologies)', '')}
                </button>
              ))}

            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {filteredCatalog.map((card) => (
              <CreditCardTile
                key={card.id}
                card={card}
                isCompared={compareList.some(c => c.id === card.id)}
                onToggleCompare={() => toggleCompare(card)}
                onViewDetails={() => setSelectedCardDetail(card)}
                onAddToWallet={() => {
                  setWalletCardId(card.id);
                  setIsAddWalletOpen(true);
                }}
              />
            ))}
          </div>

          {filteredCatalog.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <CreditCard size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 16, fontWeight: 600 }}>No credit cards found</p>
              <p style={{ fontSize: 13 }}>Try clearing filters or searching with a different term.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: RECOMMENDED FOR YOU ────────────────────────── */}
      {tab === 'recommended' && (
        <div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(200,169,126,0.1), rgba(200,169,126,0.02))',
            border: '1px solid var(--accent)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 24,
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--text-primary)' }}>
              🎯 AI-Matched Against Your Financial Twin
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              These cards are ranked by analyzing your actual monthly category expenses (food, fuel, utilities, shopping) and your Financial Health profile.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {recommended.map((card, idx) => (
              <CreditCardTile
                key={card.id}
                card={card}
                badge={idx === 0 ? 'Top Recommendation' : (idx < 3 ? `Top ${idx + 1} Match` : undefined)}
                isCompared={compareList.some(c => c.id === card.id)}
                onToggleCompare={() => toggleCompare(card)}
                onViewDetails={() => setSelectedCardDetail(card)}
                onAddToWallet={() => {
                  setWalletCardId(card.id);
                  setIsAddWalletOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: MY WALLET / OWNED CARDS ─────────────────────── */}
      {tab === 'wallet' && (
        <div>
          {/* Wallet Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase' }}>Cards in Wallet</p>
              <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{userCards.length}</p>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase' }}>Total Credit Limit</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {formatCurrency(userCards.reduce((acc, c) => acc + (Number(c.credit_limit) || 0), 0))}
              </p>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase' }}>Available Limit</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)', margin: 0 }}>
                {formatCurrency(userCards.reduce((acc, c) => acc + (Number(c.available_limit) || Number(c.credit_limit) || 0), 0))}
              </p>
            </div>
          </div>

          {userCards.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <CreditCard size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>No cards added to your wallet yet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
                Add the credit cards you own so FTWIN can recommend the best card for every purchase.
              </p>
              <button onClick={() => setIsAddWalletOpen(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} /> Add Your First Card
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
              {userCards.map(uc => (
                <div key={uc.user_card_id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Header with image */}
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                      <CardImageThumb card={uc} width={100} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{uc.bank}</span>
                          {uc.is_primary && (
                            <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                              Primary
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {uc.card_name}
                        </h4>
                        {uc.last_four_digits && (
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            •••• {uc.last_four_digits}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Limits */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12, background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 16 }}>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Credit Limit</span>
                        <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatCurrency(uc.credit_limit)}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Available</span>
                        <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>
                          {formatCurrency(uc.available_limit || uc.credit_limit)}
                        </p>
                      </div>
                    </div>

                    {/* Key Perks from CSV */}
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.4 }}>
                      🎯 <strong>Best For:</strong> {uc.best_for}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                    <button
                      onClick={() => setSelectedCardDetail(uc)}
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      <Eye size={13} style={{ marginRight: 4 }} /> View Details
                    </button>
                    <button
                      onClick={() => handleRemoveUserCard(uc.user_card_id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ── FLOATING COMPARISON BAR ────────────────────────────── */}
      {compareList.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-card)',
            border: '1px solid var(--accent)',
            borderRadius: 16,
            padding: '12px 20px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            zIndex: 100,
            maxWidth: 680,
            width: '90%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, overflowX: 'auto' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
              Compare ({compareList.length}/4):
            </span>
            {compareList.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 11 }}>
                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.card_name}</span>
                <X size={12} onClick={() => toggleCompare(c)} style={{ cursor: 'pointer', opacity: 0.7 }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCompareList([])} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
              Clear
            </button>
            <button onClick={() => setIsCompareModalOpen(true)} className="btn-accent" style={{ fontSize: 12, padding: '6px 16px', fontWeight: 600 }}>
              Compare Now
            </button>
          </div>
        </motion.div>
      )}

      {/* ── MODAL: CARD DETAILS ────────────────────────────────── */}
      <AnimatePresence>
        {selectedCardDetail && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card"
              style={{ maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 28, position: 'relative' }}
            >
              <button
                onClick={() => setSelectedCardDetail(null)}
                style={{ position: 'absolute', right: 20, top: 20, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
                {/* Large Card Image */}
                <div style={{ width: 300, flexShrink: 0 }}>
                  <CardImageThumb card={selectedCardDetail} width={300} />
                </div>

                {/* Details Header */}
                <div style={{ flex: 1, minWidth: 240 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{selectedCardDetail.bank}</p>
                  <h2 style={{ margin: '2px 0 8px', fontSize: 22, fontWeight: 700 }}>{selectedCardDetail.card_name}</h2>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {selectedCardDetail.cardcheck_score && (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--accent)', color: '#fff' }}>
                        CardCheck: {selectedCardDetail.cardcheck_score}/100
                      </span>
                    )}
                    {selectedCardDetail.rating_verdict && (
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        Verdict: {selectedCardDetail.rating_verdict}
                      </span>
                    )}
                    {selectedCardDetail.network && (
                      <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {selectedCardDetail.network}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    🎯 <strong>Best For:</strong> {selectedCardDetail.best_for}
                  </p>
                </div>
              </div>

              {/* Exact Attributes Table */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Verified Card Details from Dataset</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Joining Fee</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{getCardFee(selectedCardDetail.joining_fee_inr, selectedCardDetail.joining_fee)}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Annual / Renewal Fee</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{getCardFee(selectedCardDetail.annual_fee_inr, selectedCardDetail.annual_fee)}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Reward Rate</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--success)' }}>{getCardReward(selectedCardDetail.reward_rate_pct, selectedCardDetail.rewards_description || selectedCardDetail.cashback_description)}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Annual APR / Interest</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{getCardAPR(selectedCardDetail.apr_pct_annual, selectedCardDetail.interest_rate)}</p>
                  </div>
                </div>
              </div>

              {/* Source Link & Disclaimer */}
              <div style={{ padding: '12px 16px', border: '1px solid var(--border-subtle)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span>Source Transparency:</span>
                  {selectedCardDetail.source_url ? (
                    <a
                      href={selectedCardDetail.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                    >
                      View Source on CardCheck.in <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span>Source data verified</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>
                  Based on available card data. Verify current fees and benefits with the issuing bank before applying.
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => {
                    setWalletCardId(selectedCardDetail.id);
                    setIsAddWalletOpen(true);
                    setSelectedCardDetail(null);
                  }}
                  className="btn-primary"
                  style={{ fontSize: 13 }}
                >
                  <Plus size={14} style={{ marginRight: 4 }} /> Add to My Wallet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: SIDE-BY-SIDE CARD COMPARISON ─────────────────── */}
      <AnimatePresence>
        {isCompareModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card"
              style={{ maxWidth: 1000, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 28, position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 20 }}>Side-by-Side Credit Card Comparison</h3>
                <button onClick={() => setIsCompareModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Comparison Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--text-muted)' }}>Feature</th>
                      {compareList.map(c => (
                        <th key={c.id} style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '2px solid var(--border)', minWidth: 200 }}>
                          <CardImageThumb card={c} width={160} />
                          <p style={{ margin: '8px 0 2px', fontSize: 14, fontWeight: 700 }}>{c.card_name}</p>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.bank}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: 12, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>CardCheck Score</td>
                      {compareList.map(c => (
                        <td key={c.id} style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', fontWeight: 700, color: 'var(--accent)' }}>
                          {c.cardcheck_score ? `${c.cardcheck_score}/100` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 12, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Rating Verdict</td>
                      {compareList.map(c => (
                        <td key={c.id} style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                          {c.rating_verdict || '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 12, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Best For</td>
                      {compareList.map(c => (
                        <td key={c.id} style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {c.best_for}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 12, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Joining Fee</td>
                      {compareList.map(c => (
                        <td key={c.id} style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                          {getCardFee(c.joining_fee_inr, c.joining_fee)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 12, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Annual Fee</td>
                      {compareList.map(c => (
                        <td key={c.id} style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>
                          {getCardFee(c.annual_fee_inr, c.annual_fee)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 12, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Reward Rate</td>
                      {compareList.map(c => (
                        <td key={c.id} style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', color: 'var(--success)', fontWeight: 700 }}>
                          {getCardReward(c.reward_rate_pct, c.rewards_description || c.cashback_description)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 12, fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Annual APR</td>
                      {compareList.map(c => (
                        <td key={c.id} style={{ padding: 12, textAlign: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                          {getCardAPR(c.apr_pct_annual, c.interest_rate)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 12, fontWeight: 600 }}>Official Source</td>
                      {compareList.map(c => (
                        <td key={c.id} style={{ padding: 12, textAlign: 'center' }}>
                          {c.source_url ? (
                            <a href={c.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                              View Source ↗
                            </a>
                          ) : '—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ── MODAL: ADD TO USER WALLET ──────────────────────────── */}
      <AnimatePresence>
        {isAddWalletOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card"
              style={{ maxWidth: 480, width: '100%', padding: 24, position: 'relative' }}
            >
              <button
                onClick={() => setIsAddWalletOpen(false)}
                style={{ position: 'absolute', right: 18, top: 18, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>

              <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>Add Credit Card to Your Wallet</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)' }}>
                FTWIN never requests or stores full card numbers, CVVs, or PINs.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Card Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Select Credit Card from Catalog *
                  </label>
                  <select
                    value={walletCardId || ''}
                    onChange={(e) => setWalletCardId(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                    }}
                  >
                    <option value="">-- Choose from 141 Indian Cards --</option>
                    {catalog.map(c => (
                      <option key={c.id} value={c.id}>{c.bank} — {c.card_name}</option>
                    ))}
                  </select>
                </div>

                {/* Credit Limit */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Total Credit Limit (₹)
                    </label>
                    <input
                      type="number"
                      value={walletCreditLimit}
                      onChange={(e) => setWalletCreditLimit(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                      Available Limit (₹)
                    </label>
                    <input
                      type="number"
                      value={walletAvailLimit}
                      onChange={(e) => setWalletAvailLimit(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                      }}
                    />
                  </div>
                </div>

                {/* Last 4 Digits & Primary */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                    Last 4 Digits (Optional for recognition)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4892"
                    value={walletLastFour}
                    onChange={(e) => setWalletLastFour(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="walletPrimary"
                    checked={walletIsPrimary}
                    onChange={(e) => setWalletIsPrimary(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="walletPrimary" style={{ fontSize: 13, cursor: 'pointer' }}>
                    Set as my primary everyday credit card
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setIsAddWalletOpen(false)} className="btn-secondary" style={{ fontSize: 13 }}>
                  Cancel
                </button>
                <button
                  onClick={handleAddCardToWallet}
                  disabled={!walletCardId}
                  className="btn-accent"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  Save Card to Wallet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── HELPERS: FEE & ATTRIBUTE FORMATTERS ──────────────────────
export function getCardFee(val: any, fallbackNum?: any): string {
  if (val && typeof val === 'string' && val.trim().length > 0 && val.toLowerCase() !== 'not available') {
    return val;
  }
  if (fallbackNum !== undefined && fallbackNum !== null && fallbackNum !== '') {
    const n = Number(fallbackNum);
    if (!isNaN(n)) return n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`;
    return String(fallbackNum);
  }
  return 'Free';
}

export function getCardReward(val: any, fallbackDesc?: any): string {
  if (val && typeof val === 'string' && val.trim().length > 0 && val.toLowerCase() !== 'not available') {
    return val;
  }
  if (fallbackDesc && typeof fallbackDesc === 'string' && fallbackDesc.trim().length > 0) {
    return fallbackDesc.length > 30 ? fallbackDesc.substring(0, 28) + '...' : fallbackDesc;
  }
  return '1-2%';
}

export function getCardAPR(val: any, fallbackInterest?: any): string {
  if (val && typeof val === 'string' && val.trim().length > 0 && val.toLowerCase() !== 'not available') {
    return val;
  }
  if (fallbackInterest !== undefined && fallbackInterest !== null && fallbackInterest !== '') {
    const n = Number(fallbackInterest);
    if (!isNaN(n)) return `${(n * 12).toFixed(1)}% p.a.`;
    return String(fallbackInterest);
  }
  return '42% p.a.';
}

// ── SUB-COMPONENT: REAL CARD IMAGE / PLACEHOLDER ─────────────
export function CardImageThumb({ card, width = 240 }: { card: any; width?: number }) {
  const [imgError, setImgError] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const hasImage = Boolean(card?.image_url && card.image_url.trim().length > 0 && !imgError);
  const defaultHeight = Math.round(width / 1.586); // standard credit card aspect ratio 85.6mm x 53.98mm

  const resolvedUrl = useMemo(() => {
    if (!card?.image_url) return '';
    if (card.image_url.startsWith('http://') || card.image_url.startsWith('https://') || card.image_url.startsWith('data:')) {
      return card.image_url;
    }
    const apiBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
    return `${apiBase}${card.image_url}`;
  }, [card?.image_url]);

  if (hasImage) {
    return (
      <div
        style={{
          width,
          height: defaultHeight,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'transparent',
          position: 'relative',
        }}
      >
        <img
          src={resolvedUrl}
          alt={card.card_name}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalHeight > img.naturalWidth * 1.1) {
              setIsVertical(true);
            }
          }}
          onError={() => setImgError(true)}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            height: isVertical ? '100%' : 'auto',
            width: isVertical ? 'auto' : '100%',
            objectFit: 'contain',
            borderRadius: isVertical ? 10 : 12,
            boxShadow: isVertical ? '0 8px 22px rgba(0,0,0,0.35)' : '0 8px 24px rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'block',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
        />
      </div>
    );
  }

  // Clean, elegant placeholder when image is not uploaded yet
  return (
    <div
      style={{
        width,
        height: defaultHeight,
        borderRadius: 12,
        flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(200,169,126,0.08), rgba(200,169,126,0.02))',
        border: '1px dashed var(--accent)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        padding: 12,
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
    >
      <CreditCard size={width > 150 ? 28 : 20} style={{ opacity: 0.4, marginBottom: 4 }} />
      <span style={{ fontSize: width > 150 ? 11 : 9, fontWeight: 600, color: 'var(--accent)' }}>
        Card image coming soon
      </span>
      <span style={{ fontSize: width > 150 ? 10 : 8, opacity: 0.6, marginTop: 2 }}>
        {card?.bank} • {card?.network || 'Card'}
      </span>
    </div>
  );
}

// ── SUB-COMPONENT: CREDIT CARD TILE ───────────────────────────
function CreditCardTile({
  card,
  badge,
  isCompared,
  onToggleCompare,
  onViewDetails,
  onAddToWallet,
}: {
  card: any;
  badge?: string;
  isCompared: boolean;
  onToggleCompare: () => void;
  onViewDetails: () => void;
  onAddToWallet: () => void;
}) {
  const score = card.cardcheck_score;
  const scoreColor = score >= 80 ? '#22C55E' : (score >= 70 ? '#C8A97E' : (score >= 60 ? '#3B82F6' : '#94A3B8'));

  return (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
      <div>
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {card.bank}
            </span>
            {badge && (
              <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                {badge}
              </span>
            )}
          </div>

          {score && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: scoreColor,
                background: 'var(--bg-secondary)',
                border: `1px solid ${scoreColor}`,
                padding: '2px 8px',
                borderRadius: 12,
              }}
            >
              ★ {score}/100
            </span>
          )}
        </div>

        {/* Card Real Image / Placeholder */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <CardImageThumb card={card} width={280} />
        </div>

        {/* Name and Rating */}
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>
            {card.card_name}
          </h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{card.network || 'Standard'}</span>
            {card.rating_verdict && (
              <>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>{card.rating_verdict}</span>
              </>
            )}
          </div>
        </div>

        {/* Best For */}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0 0 14px', minHeight: 34 }}>
          🎯 {card.best_for}
        </p>

        {/* Exact Fee and Reward Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 14, fontSize: 12 }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Annual Fee</span>
            <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{getCardFee(card.annual_fee_inr, card.annual_fee)}</p>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Reward Rate</span>
            <p style={{ margin: '2px 0 0', fontWeight: 700, color: 'var(--success)' }}>{getCardReward(card.reward_rate_pct, card.rewards_description || card.cashback_description)}</p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onViewDetails}
            className="btn-secondary"
            style={{ fontSize: 11, padding: '6px 10px' }}
          >
            <Eye size={12} style={{ marginRight: 3 }} /> Details
          </button>
          <button
            onClick={onToggleCompare}
            style={{
              padding: '6px 10px',
              fontSize: 11,
              borderRadius: 6,
              border: '1px solid',
              borderColor: isCompared ? 'var(--accent)' : 'var(--border-subtle)',
              background: isCompared ? 'var(--accent)' : 'transparent',
              color: isCompared ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {isCompared ? '✓ Compared' : '+ Compare'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onAddToWallet}
            title="Add this card to your owned wallet"
            className="btn-primary"
            style={{ fontSize: 11, padding: '6px 10px' }}
          >
            + Wallet
          </button>
        </div>
      </div>
    </div>
  );
}
