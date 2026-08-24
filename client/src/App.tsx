import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FinancialProvider } from './contexts/FinancialContext';
import Navbar from './components/layout/Navbar';
import FtwinIntro from './components/FtwinIntro';
import HomePage from './pages/Home';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import OnboardingPage from './pages/Auth/Onboarding';
import DashboardPage from './pages/Dashboard';
import TwinPage from './pages/Twin';
import AdvisorPage from './pages/Advisor';
import SimulatorPage from './pages/Simulator';
import InvestPage from './pages/Invest';
import CardsPage from './pages/Cards';
import GoalsPage from './pages/Goals';
import ChatPage from './pages/Chat';
import ProfilePage from './pages/Profile';
import BankPage from './pages/Bank';
import React, { useState } from 'react';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading FTWIN...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 64 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/twin" element={<ProtectedRoute><TwinPage /></ProtectedRoute>} />
          <Route path="/advisor" element={<ProtectedRoute><AdvisorPage /></ProtectedRoute>} />
          <Route path="/simulator" element={<ProtectedRoute><SimulatorPage /></ProtectedRoute>} />
          <Route path="/invest" element={<ProtectedRoute><InvestPage /></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><CardsPage /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/bank" element={<ProtectedRoute><BankPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  // Only play the intro once per browser tab session
  const [showIntro, setShowIntro] = useState(() => {
    const seen = sessionStorage.getItem('ftwin_intro_seen');
    return !seen;
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('ftwin_intro_seen', '1');
    setShowIntro(false);
  };

  return (
    <>
      {showIntro && <FtwinIntro onComplete={handleIntroComplete} />}
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <FinancialProvider>
              <AppRoutes />
            </FinancialProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </>
  );
}
