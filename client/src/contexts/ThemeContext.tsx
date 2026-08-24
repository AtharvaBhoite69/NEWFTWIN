import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('ftwin_theme');
    return (saved as Theme) || 'light';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ftwin_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const nextTheme = theme === 'light' ? 'dark' : 'light';

    // Get origin point from the toggle button
    const btn = document.getElementById('theme-toggle-btn');
    let originX = '90%';
    let originY = '32px';
    if (btn) {
      const rect = btn.getBoundingClientRect();
      originX = `${rect.left + rect.width / 2}px`;
      originY = `${rect.top + rect.height / 2}px`;
    }

    // Create the wave overlay
    const wave = document.createElement('div');
    wave.className = `theme-wave-overlay ${nextTheme === 'dark' ? 'to-dark' : 'to-light'}`;
    wave.style.clipPath = `circle(0% at ${originX} ${originY})`;
    document.body.appendChild(wave);

    // Trigger expansion on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wave.style.clipPath = `circle(150% at ${originX} ${originY})`;
      });
    });

    // Apply theme at the visual midpoint
    setTimeout(() => {
      setTheme(nextTheme);
    }, 500);

    // Clean up after animation completes
    setTimeout(() => {
      wave.remove();
      setIsTransitioning(false);
    }, 1500);
  }, [theme, isTransitioning]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
