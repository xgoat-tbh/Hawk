'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
export type Theme = 'dark' | 'light' | 'system';
const ThemeContext = createContext({ theme: 'system' as Theme, resolvedTheme: 'dark' as 'dark' | 'light', toggleTheme: () => {}, setTheme: (_theme: Theme) => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => { try { const saved = localStorage.getItem('hawk_theme'); if (saved === 'dark' || saved === 'light' || saved === 'system') setTheme(saved); } catch { /* Storage may be unavailable; keep the current preference. */ } }, []);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme; setResolvedTheme(resolved); document.documentElement.classList.remove('dark', 'light'); document.documentElement.classList.add(resolved); document.documentElement.style.colorScheme = resolved; };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  const change = (value: Theme) => { setTheme(value); try { localStorage.setItem('hawk_theme', value); } catch { /* Storage may be unavailable; keep the current preference. */ } };
  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: change, toggleTheme: () => change(resolvedTheme === 'dark' ? 'light' : 'dark') }}><MotionConfig reducedMotion="user">{children}</MotionConfig></ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
