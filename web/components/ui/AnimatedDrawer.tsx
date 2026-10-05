'use client';
import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { drawerVariants } from '@/lib/motion';
import { X } from 'lucide-react';
import { HawkScrollArea } from './HawkScrollArea';
interface Props { isOpen: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode; width?: string; }
export function AnimatedDrawer({ isOpen, onClose, title, subtitle, children, width = 'max-w-md' }: Props) {
  return <Dialog.Root open={isOpen} onOpenChange={open => { if (!open) onClose(); }}><AnimatePresence>{isOpen && <Dialog.Portal forceMount>
    <Dialog.Overlay forceMount asChild><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" /></Dialog.Overlay>
    <Dialog.Content forceMount asChild aria-describedby={subtitle ? undefined : undefined}><motion.div variants={drawerVariants} initial="initial" animate="enter" exit="exit" className={`fixed inset-y-0 right-0 h-full border-l z-50 w-[calc(100%-2rem)] ${width} bg-surface-3 border-border rounded-lg shadow-2xl flex flex-col overflow-hidden`}>
      <header className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0"><div><Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>{subtitle && <Dialog.Description className="text-xs text-text-muted mt-1">{subtitle}</Dialog.Description>}</div><Dialog.Close className="btn-ghost" aria-label="Close drawer"><X size={18} /></Dialog.Close></header>
      <HawkScrollArea className="flex-1 p-5">{children}</HawkScrollArea>
    </motion.div></Dialog.Content>
  </Dialog.Portal>}</AnimatePresence></Dialog.Root>;
}
