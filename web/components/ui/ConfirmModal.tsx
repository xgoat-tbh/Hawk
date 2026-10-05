'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Loader2 } from 'lucide-react';
interface ConfirmModalProps { isOpen: boolean; onClose: () => void; onConfirm: () => Promise<void> | void; title: string; description: string; confirmLabel?: string; cancelLabel?: string; variant?: 'danger' | 'warning' | 'primary'; isLoading?: boolean; }
export function ConfirmModal({ isOpen, onClose, onConfirm, title, description, confirmLabel='Confirm', cancelLabel='Cancel', variant='danger', isLoading=false }: ConfirmModalProps) {
 const [pending,setPending]=useState(false); const busy=isLoading || pending;
 return <AlertDialog.Root open={isOpen} onOpenChange={open => { if (!open && !busy) onClose(); }}><AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"/><AlertDialog.Content className="fixed z-50 top-[20dvh] inset-x-4 sm:inset-x-0 mx-auto max-w-md bg-surface-3 border border-border rounded-xl p-6"><AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title><AlertDialog.Description className="mt-3 text-sm text-text-secondary leading-relaxed">{description}</AlertDialog.Description><div className="flex justify-end gap-3 pt-6"><AlertDialog.Cancel className="btn-secondary" disabled={busy}>{cancelLabel}</AlertDialog.Cancel><AlertDialog.Action className={variant === 'danger' ? 'btn-outline-danger' : 'btn-primary'} disabled={busy} onClick={async event => { event.preventDefault(); if (busy) return; setPending(true); try { await onConfirm(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Action failed'); } finally { setPending(false); } }}>{busy && <Loader2 size={14} className="animate-spin mr-2"/>}{confirmLabel}</AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>;
}
