'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { animateDrawerOpen, animateDrawerClose } from '@/lib/animations';

interface AnimatedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export function AnimatedDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-md',
}: AnimatedDrawerProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      animateDrawerOpen(drawerRef.current, backdropRef.current);
    }
  }, [isOpen]);

  const handleClose = () => {
    animateDrawerClose(drawerRef.current, backdropRef.current, onClose);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Body with Independent Internal Scroll */}
      <div
        ref={drawerRef}
        className={`relative z-10 w-full ${width} bg-[#0a0a0c] border-l border-white/[0.08] shadow-2xl flex flex-col h-full overflow-hidden`}
      >
        {/* Drawer Header (Fixed) */}
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-[#08080a]">
          <div className="space-y-0.5 overflow-hidden">
            <h2 className="text-sm font-semibold text-white tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-white/40 truncate">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content (Independently Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}
