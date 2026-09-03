'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { HawkScrollArea } from './HawkScrollArea';
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    animateDrawerClose(drawerRef.current, backdropRef.current, onClose);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end select-none">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Drawer Body with Independent Internal Scroll */}
      <div
        ref={drawerRef}
        className={`relative z-10 w-full ${width} bg-[#0d0e10] border-l border-[#1f2226] shadow-drawer-clean flex flex-col h-full overflow-hidden`}
      >
        {/* Drawer Header (Fixed) */}
        <div className="px-5 py-3.5 border-b border-[#17191c] flex items-center justify-between shrink-0 bg-[#0a0b0d]">
          <div className="space-y-0.5 overflow-hidden">
            <h2 className="text-sm font-semibold text-[#ededed] tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-[#6e747c] truncate">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-[#6e747c] hover:text-[#ededed] hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content (Independently Scrollable with HawkScrollArea) */}
        <HawkScrollArea className="flex-1 p-5 space-y-5">
          {children}
        </HawkScrollArea>
      </div>
    </div>
  );
}
