'use client';
import React from 'react';
import { Toaster, toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export function useToast() {
  const showToast = (message: string, type: ToastType = 'info', title?: string) => toast[type](title || message, title ? { description: message } : undefined);
  return { showToast, success: (m: string, t?: string) => showToast(m, 'success', t), error: (m: string, t?: string) => showToast(m, 'error', t), warning: (m: string, t?: string) => showToast(m, 'warning', t), info: (m: string, t?: string) => showToast(m, 'info', t) };
}
export function ToastProvider({ children }: { children: React.ReactNode }) { const { resolvedTheme } = useTheme(); return <>{children}<Toaster theme={resolvedTheme} richColors closeButton position="top-right" /></>; }
