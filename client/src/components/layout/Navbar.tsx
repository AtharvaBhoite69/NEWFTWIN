import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LayoutDashboard, BrainCircuit, LineChart, TrendingUp,
  CreditCard, Target, MessageSquare, User, Sun, Moon,
  Menu, X, LogOut, Settings, Home, ChevronDown, Landmark,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home, authRequired: false },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, authRequired: true },
  { path: '/twin', label: 'Twin', icon: BrainCircuit, authRequired: true },
  { path: '/advisor', label: 'Advisor', icon: LineChart, authRequired: true },
  { path: '/simulator', label: 'Simulator', icon: TrendingUp, authRequired: true },
  { path: '/invest', label: 'Invest', icon: TrendingUp, authRequired: true },
  { path: '/cards', label: 'Cards', icon: CreditCard, authRequired: true },
  { path: '/goals', label: 'Goals', icon: Target, authRequired: true },
  { path: '/chat', label: 'Chat', icon: MessageSquare, authRequired: true },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const filteredNav = navItems.filter(item =>
    !item.authRequired || isAuthenticated
  );

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: `color-mix(in srgb, var(--bg-primary) 85%, transparent)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--bg-primary)', fontWeight: 800, fontSize: 14,
            }}>
              FT
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              FTWIN
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'auto' }}>
            {filteredNav.map(item => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  padding: '7px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  color: location.pathname === item.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: location.pathname === item.path ? 'var(--accent-subtle)' : 'transparent',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {isAuthenticated ? (
              <div style={{ position: 'relative' }} ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer', fontSize: 14,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="nav-username">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown size={14} />
                </button>

                {profileOpen && (
                  <div
                    style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 8,
                      width: 200, background: 'var(--bg-card)',
                      border: '1px solid var(--border)', borderRadius: 12,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 50,
                    }}
                  >
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
                    </div>
                    <DropdownLink icon={<User size={16} />} label="Profile" to="/profile" onClick={() => setProfileOpen(false)} />
                    <DropdownLink icon={<Landmark size={16} />} label="Bank Accounts" to="/bank" onClick={() => setProfileOpen(false)} />
                    <button
                      onClick={handleLogout}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', width: '100%',
                        border: 'none', background: 'transparent',
                        color: 'var(--danger)', fontSize: 14,
                        cursor: 'pointer', textAlign: 'left',
                        borderTop: '1px solid var(--border)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/login" className="btn-secondary" style={{ padding: '8px 16px', fontSize: 14 }}>
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary" style={{ padding: '8px 16px', fontSize: 14 }}>
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="nav-mobile-toggle"
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div
          className="nav-mobile-menu"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-primary)',
          }}
        >
          {filteredNav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 0', textDecoration: 'none',
                color: location.pathname === item.path ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: location.pathname === item.path ? 600 : 400,
                fontSize: 16, borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

function DropdownLink({ icon, label, to, onClick }: { icon: React.ReactNode; label: string; to: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', textDecoration: 'none',
        color: 'var(--text-primary)', fontSize: 14,
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon} {label}
    </Link>
  );
}
