import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFinancial } from '../../contexts/FinancialContext';
import { formatCurrency } from '../../lib/utils';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, Brain, LineChart, Shield, Target, Zap, BarChart3 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   ROTATING WORD — Premium vertical slide
   ═══════════════════════════════════════════════════════════════ */

const WORDS = ['smarter.', 'harder.', 'better.', 'for you.'];

function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % WORDS.length);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isLast = index === WORDS.length - 1;

  return (
    /*
     * The container must be:
     * - wide enough for the longest word ("smarter." = 9 chars)
     * - tall enough for the font + descenders
     * We size it as a block so it takes up its own line row.
     */
    <span
      style={{
        display: 'inline-block',
        position: 'relative',
        height: '1.3em',
        /* Reserve space for the longest word "smarter." */
        minWidth: '10ch',
        overflow: 'hidden',
        verticalAlign: 'top',
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={WORDS[index]}
          initial={{ y: '110%', opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-110%', opacity: 0, filter: 'blur(8px)' }}
          transition={{
            duration: 0.35,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
          style={{
            display: 'inline-block',
            position: 'absolute',
            top: 0,
            left: 0,
            lineHeight: 1.08,
            color: isLast ? 'var(--accent)' : '#F0EDE6',
            fontStyle: isLast ? 'normal' : 'italic',
            fontWeight: isLast ? 800 : 700,
            whiteSpace: 'nowrap',
          }}
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL TEXT PAIR — horizontal parallax
   ═══════════════════════════════════════════════════════════════ */

function ScrollTextPair({ line1, line2 }: { line1: string; line2: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const x1 = useTransform(scrollYProgress, [0, 1], ['-12%', '8%']);
  const x2 = useTransform(scrollYProgress, [0, 1], ['8%', '-12%']);

  return (
    <div ref={ref} style={{ padding: '50px 0', overflow: 'hidden' }}>
      <motion.div
        style={{
          x: x1,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(44px, 10vw, 130px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.04em',
          whiteSpace: 'nowrap',
          color: 'var(--text-primary)',
          opacity: 0.1,
          willChange: 'transform',
        }}
      >
        {line1}
      </motion.div>
      <motion.div
        style={{
          x: x2,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(44px, 10vw, 130px)',
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: '-0.04em',
          whiteSpace: 'nowrap',
          color: 'var(--text-primary)',
          opacity: 0.1,
          textAlign: 'right',
          willChange: 'transform',
        }}
      >
        {line2}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCROLL NARRATIVE — fade in on view
   ═══════════════════════════════════════════════════════════════ */

function Narrative({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      style={{
        maxWidth: 700,
        margin: '0 auto',
        padding: '70px 32px',
        textAlign: 'center',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FINANCIAL CARD — count-up
   ═══════════════════════════════════════════════════════════════ */

function MetricCard({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || !value) return;
    const dur = 1100;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      className="financial-reveal-card"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55 }}
    >
      <div className="financial-reveal-label">{label}</div>
      <div className="financial-reveal-value" style={{ color: color || 'var(--text-primary)' }}>
        {suffix === '%' ? `${display}%` : formatCurrency(display)}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURE CARD
   ═══════════════════════════════════════════════════════════════ */

function FeatureCard({ icon: Icon, title, desc, i }: { icon: any; title: string; desc: string; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      className="card"
      style={{ padding: 28 }}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay: i * 0.07 }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Icon size={24} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>{desc}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOMEPAGE
   ═══════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { snapshot, refreshFinancialData } = useFinancial();

  useEffect(() => {
    if (isAuthenticated) refreshFinancialData();
  }, [isAuthenticated]);

  const hasData = isAuthenticated && snapshot && snapshot.totalMonthlyIncome > 0;

  return (
    <div style={{ background: 'var(--bg-primary)' }}>

      {/* ══════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: '#080808',
        }}
      >
        {/* Video background */}
        <video
          autoPlay muted loop playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
          }}
          poster=""
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        {/* Subtle gradient for text readability — left dark, right clear */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: `
              linear-gradient(90deg,
                rgba(8,8,8,0.78) 0%,
                rgba(8,8,8,0.50) 40%,
                rgba(8,8,8,0.18) 65%,
                rgba(8,8,8,0.04) 100%
              ),
              linear-gradient(180deg,
                rgba(8,8,8,0.15) 0%,
                transparent 25%,
                transparent 75%,
                rgba(8,8,8,0.55) 100%
              )
            `,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            maxWidth: 1400,
            margin: '0 auto',
            padding: 'clamp(100px, 15vh, 160px) clamp(24px, 4vw, 64px) clamp(60px, 10vh, 120px)',
            width: '100%',
          }}
        >
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 32,
            }}
          >
            Your Personal Financial Operating System
          </motion.p>

          {/* ─── ROTATING TAGLINE ─── */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(42px, 7.5vw, 90px)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: '#F0EDE6',
              marginBottom: 28,
              maxWidth: 900,
              /* Each <span> is block so lines break naturally */
            }}
          >
            {/* Line 1 */}
            <span style={{ display: 'block' }}>Your money</span>
            {/* Line 2 */}
            <span style={{ display: 'block' }}>should work</span>
            {/* Line 3 — rotating word fills this line */}
            <span style={{ display: 'block', lineHeight: 1.2 }}>
              <RotatingWord />
            </span>
          </motion.h1>

          {/* Supporting text */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            style={{
              fontSize: 'clamp(15px, 1.6vw, 18px)',
              lineHeight: 1.7,
              color: 'rgba(240,237,230,0.65)',
              maxWidth: 480,
              marginBottom: 40,
            }}
          >
            Your personal financial twin that helps you understand your money,
            simulate decisions, and build a smarter financial future.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.95 }}
            style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
          >
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="hero-btn-gold"
            >
              Build My Twin <ArrowRight size={16} />
            </Link>
            <Link
              to={isAuthenticated ? '/dashboard' : '/register'}
              className="hero-btn-glass"
            >
              Explore FTWIN
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SCROLL STORYTELLING
          ══════════════════════════════════════════════════════ */}
      <section style={{ overflow: 'hidden', paddingTop: 20, paddingBottom: 20 }}>

        {/* ── Pair 1 ── */}
        <ScrollTextPair line1="MONEY COMES IN." line2="MONEY GOES OUT." />

        <Narrative>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(22px, 3.5vw, 38px)',
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: '-0.015em',
            color: 'var(--text-primary)',
          }}>
            But do you know where it goes?
          </p>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'clamp(15px, 1.8vw, 20px)',
            lineHeight: 1.7,
            marginTop: 16,
          }}>
            Rent. EMIs. Subscriptions. Groceries. They quietly consume your salary every month.
          </p>
        </Narrative>

        <div style={{ width: 60, height: 1, background: 'var(--accent)', margin: '0 auto', opacity: 0.4 }} />

        {/* ── Pair 2 ── */}
        <ScrollTextPair line1="YOUR MONEY" line2="DESERVES A PLAN." />

        <Narrative>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(22px, 3.5vw, 38px)',
            fontWeight: 500,
            lineHeight: 1.4,
            color: 'var(--text-primary)',
          }}>
            You save for your family. You plan your wedding.
            You think about your first home.
          </p>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'clamp(15px, 1.8vw, 20px)',
            lineHeight: 1.7,
            marginTop: 16,
          }}>
            You invest when there is something left. Sometimes there isn't.
          </p>
        </Narrative>

        <div style={{ width: 60, height: 1, background: 'var(--accent)', margin: '0 auto', opacity: 0.4 }} />

        {/* ── Pair 3 ── */}
        <ScrollTextPair line1="UNDERSTAND." line2="DECIDE. GROW." />

        <Narrative>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(24px, 4vw, 44px)',
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--text-primary)',
          }}>
            Your financial life isn't a collection of transactions.
          </p>
        </Narrative>

        <Narrative style={{ paddingTop: 0 }}>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(24px, 4vw, 44px)',
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--text-primary)',
          }}>
            It is a <span style={{ color: 'var(--accent)' }}>system.</span>
          </p>
        </Narrative>

        <Narrative style={{ paddingTop: 0 }}>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(30px, 5vw, 56px)',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            <span style={{ color: 'var(--accent)' }}>FTWIN</span> connects it.
          </p>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 'clamp(14px, 1.5vw, 17px)',
            lineHeight: 1.7,
            marginTop: 20,
          }}>
            FTWIN turns your financial life into something you can understand, simulate, and improve.
          </p>
        </Narrative>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINANCIAL DATA REVEAL
          ══════════════════════════════════════════════════════ */}
      <section style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="financial-reveal">
          <div className="financial-reveal-header">
            <h2>
              {hasData
                ? "Now let's see what your money is actually doing."
                : 'See your complete financial picture.'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
              {hasData
                ? 'Real-time intelligence computed from your Financial Twin.'
                : 'Build your Twin to get personalized insights.'}
            </p>
          </div>

          {hasData ? (
            <div className="financial-reveal-grid">
              <MetricCard label="MONTHLY INCOME" value={snapshot.totalMonthlyIncome} color="var(--success)" />
              <MetricCard label="MONTHLY EXPENSES" value={snapshot.totalMonthlyExpenses} />
              <MetricCard label="SAVINGS RATE" value={snapshot.savingsRate} suffix="%" color="var(--accent)" />
              <MetricCard label="INVESTMENT CAPACITY" value={snapshot.investmentCapacity} color="var(--info)" />
              <MetricCard label="EMERGENCY FUND" value={snapshot.emergencyFundMonths} suffix="%" />
              <MetricCard label="TOTAL DEBT" value={snapshot.totalDebt} color={snapshot.totalDebt > 0 ? 'var(--danger)' : undefined} />
            </div>
          ) : (
            <div className="financial-reveal-grid">
              {[
                { label: 'INCOME', v: '₹—' },
                { label: 'EXPENSES', v: '₹—' },
                { label: 'SAVINGS RATE', v: '—%' },
                { label: 'INVESTMENT CAPACITY', v: '₹—' },
                { label: 'EMERGENCY FUND', v: '— Mo' },
                { label: 'TOTAL DEBT', v: '₹—' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="financial-reveal-card"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                >
                  <div className="financial-reveal-label">{item.label}</div>
                  <div className="financial-reveal-value" style={{ color: 'var(--text-muted)' }}>{item.v}</div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES
          ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
          <h2 className="font-editorial" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, marginBottom: 16 }}>
            Complete Financial Intelligence
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>
            Everything you need to understand, plan, and optimize your financial life.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {[
            { icon: Brain, title: 'Financial Twin', desc: 'A synchronized digital replica of your finances with real-time health scoring.' },
            { icon: Shield, title: 'Health Score (0–100)', desc: 'Comprehensive score across savings, debt, emergency funds, and expense ratios.' },
            { icon: Target, title: 'Goal Velocity Engine', desc: 'Track goals with realistic timelines. Know whether you are on track or behind.' },
            { icon: Zap, title: 'AI Assistant', desc: 'Chat naturally. Add expenses, simulate choices, and get tailored advice.' },
            { icon: LineChart, title: 'Investment Capacity', desc: 'Find your true surplus before investing in mutual funds, stocks, or gold.' },
            { icon: BarChart3, title: 'Smart Card Recommendations', desc: 'Credit card suggestions matched to your actual category spending.' },
          ].map((f, i) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} i={i} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINAL CTA
          ══════════════════════════════════════════════════════ */}
      <section className="final-cta" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2>
            Your money should work{' '}
            <span style={{ color: 'var(--accent)' }}>for you.</span>
          </h2>
          <p>
            Takes 3 minutes to set up. Free, secure, and built specifically for Indian finances.
          </p>
          <Link to={isAuthenticated ? '/dashboard' : '/register'} className="hero-btn-gold">
            Build Your Twin <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
