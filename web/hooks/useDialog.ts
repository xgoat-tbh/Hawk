'use client';
import { useEffect, useRef, type RefObject } from 'react';
const dialogs: HTMLElement[] = [];
export function useDialog(open: boolean, ref: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const node = ref.current;
    if (!open || !node) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogs.push(node);
    const focusable = () => Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length);
    (focusable()[0] || node).focus();
    const handleKey = (e: KeyboardEvent) => {
      if (dialogs.at(-1) !== node || e.defaultPrevented) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') {
        const items = focusable(); const first = items[0]; const last = items.at(-1);
        if (!first) { e.preventDefault(); node.focus(); }
        else if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const keepFocus = (e: FocusEvent) => {
      if (dialogs.at(-1) === node && !node.contains(e.target as Node)) (focusable()[0] || node).focus();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', keepFocus);
    return () => {
      dialogs.splice(dialogs.indexOf(node), 1);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', keepFocus);
      if (previous?.isConnected) previous.focus();
    };
  }, [open, ref]);
}
