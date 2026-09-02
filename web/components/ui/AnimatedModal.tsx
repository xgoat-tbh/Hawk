'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { HawkScrollArea } from './HawkScrollArea';
import { animateModalOpen, animateModalClose } from '@/lib/animations';

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
    animateModalClose(modalRef.current, backdropRef.current, onClose);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className={`relative z-10 w-full ${maxWidth} bg-[#0d0e10] border border-[#24272b] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]`}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1c1f23] flex items-center justify-between shrink-0 bg-[#08090a]">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[#f1f2f3] tracking-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-[#7e8389]">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-[#7e8389] hover:text-[#f1f2f3] hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Independently Scrollable with HawkScrollArea) */}
        <HawkScrollArea className="flex-1 p-5">
          {children}
        </HawkScrollArea>
      </div>
    </div>
  );
}
