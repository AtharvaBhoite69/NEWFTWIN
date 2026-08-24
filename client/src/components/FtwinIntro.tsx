import React, { useEffect, useState } from 'react';

/**
 * FTWIN Intro Splash — Mastercard-inspired reveal animation
 *
 * Phase 1 (0 – 0.6s) : Two gold circles slide in from opposite sides and meet at centre.
 * Phase 2 (0.6 – 1.2s): FT lettermark fades in between the circles.
 * Phase 3 (1.2 – 1.8s): Circles + logo scale up dramatically to fill entire viewport.
 * Phase 4 (1.8 – 2.4s): Overlay fades out, revealing the website beneath.
 *
 * Only plays once per browser session (stored in sessionStorage).
 */

interface FtwinIntroProps {
  onComplete: () => void;
}

export default function FtwinIntro({ onComplete }: FtwinIntroProps) {
  // phase: 0=circles sliding in | 1=logo visible | 2=zoom fill | 3=fade out
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600);   // logo appears
    const t2 = setTimeout(() => setPhase(2), 1200);  // zoom fill
    const t3 = setTimeout(() => setPhase(3), 1800);  // fade out overlay
    const t4 = setTimeout(() => onComplete(), 2500);  // unmount
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  // Circle size grows enough to fully cover viewport diagonally
  const CIRCLE_BASE = 120;
  const FILL_SCALE  = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight) / CIRCLE_BASE * 1.1);

  const circleStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    width:  CIRCLE_BASE,
    height: CIRCLE_BASE,
    borderRadius: '50%',
    /* Left circle is dark gold/olive, right circle is warm champagne gold */
    background: side === 'left'
      ? 'radial-gradient(circle at 40% 40%, #D4A853, #A07828)'
      : 'radial-gradient(circle at 60% 40%, #F0C96A, #C4A265)',
    top:  '50%',
    left: '50%',
    /* Meet at centre, offset by half width so they kiss in the middle */
    transform: phase >= 2
      ? `translate(-50%, -50%) scale(${FILL_SCALE})`
      : phase >= 0
        ? `translate(${side === 'left' ? 'calc(-50% - 42px)' : 'calc(-50% + 42px)'}, -50%) scale(1)`
        : `translate(${side === 'left' ? 'calc(-50% - 120vw)' : 'calc(-50% + 120vw)'}, -50%) scale(1)`,
    transition: phase >= 2
      ? 'transform 0.7s cubic-bezier(0.16,1,0.3,1)'
      : 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
    mixBlendMode: 'normal',
    willChange: 'transform',
  });

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    opacity: phase >= 3 ? 0 : 1,
    transition: phase >= 3 ? 'opacity 0.65s ease' : 'none',
    pointerEvents: phase >= 3 ? 'none' : 'all',
  };

  const logoStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: phase >= 2
      ? `translate(-50%, -50%) scale(${FILL_SCALE * 0.4})`
      : 'translate(-50%, -50%) scale(1)',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 0,
    opacity: phase >= 1 && phase < 3 ? 1 : 0,
    transition: phase >= 2
      ? 'transform 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease'
      : 'opacity 0.3s ease',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  return (
    <div style={overlayStyle} aria-hidden="true">
      {/* Left circle */}
      <div style={circleStyle('left')} />
      {/* Right circle */}
      <div style={circleStyle('right')} />

      {/* FT Lettermark — sits above circles in z-order */}
      <div style={logoStyle}>
        <div style={{
          width: 72, height: 72, borderRadius: 16,
          background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 28, letterSpacing: '-0.04em',
          color: '#0A0A0A',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          fontFamily: "'Inter', sans-serif",
        }}>
          FT
        </div>
        <div style={{
          marginTop: 10, fontSize: 18, fontWeight: 800, letterSpacing: '0.12em',
          color: '#fff', fontFamily: "'Inter', sans-serif",
          textTransform: 'uppercase',
        }}>
          FTWIN
        </div>
      </div>

      {/* Scanline shimmer on circles */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)',
      }} />
    </div>
  );
}
