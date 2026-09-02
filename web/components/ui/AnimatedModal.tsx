'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { animateModalOpen } from '@/lib/animations';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function AnimatedModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: AnimatedModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      animateModalOpen(modalRef.current, backdropRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className={`relative z-10 w-full ${maxWidth} bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]`}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0 bg-[#08080a]">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-white tracking-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-white/40">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Independently Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
