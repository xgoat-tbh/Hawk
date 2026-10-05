'use client';
import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { modalVariants } from '@/lib/motion';
import { X } from 'lucide-react';
import { HawkScrollArea } from './HawkScrollArea';
interface Props { isOpen: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; maxWidth?: string; }
export function AnimatedModal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }: Props) {
  return <Dialog.Root open={isOpen} onOpenChange={open => { if (!open) onClose(); }}><AnimatePresence>{isOpen && <Dialog.Portal forceMount>
    <Dialog.Overlay forceMount asChild><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" /></Dialog.Overlay>
    <Dialog.Content forceMount asChild aria-describedby={subtitle ? undefined : undefined}><motion.div variants={modalVariants} initial="initial" animate="enter" exit="exit" className={`fixed inset-x-0 mx-auto top-[10dvh] max-h-[80dvh] border z-50 w-[calc(100%-2rem)] ${maxWidth} bg-surface-3 border-border rounded-lg shadow-2xl flex flex-col overflow-hidden`}>
      <header className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0"><div><Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>{subtitle && <Dialog.Description className="text-xs text-text-muted mt-1">{subtitle}</Dialog.Description>}</div><Dialog.Close className="btn-ghost" aria-label="Close modal"><X size={18} /></Dialog.Close></header>
      <HawkScrollArea className="flex-1 p-5">{children}</HawkScrollArea>
    </motion.div></Dialog.Content>
  </Dialog.Portal>}</AnimatePresence></Dialog.Root>;
}
