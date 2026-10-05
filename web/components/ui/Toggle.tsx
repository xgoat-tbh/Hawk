'use client';
import React from 'react';
import { Loader2 } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
export function Toggle({ checked, onChange, label, disabled, loading }: {
  checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean; loading?: boolean;
}) {
  return <Switch.Root checked={checked} aria-label={label}
    disabled={disabled || loading} onCheckedChange={onChange} className="hawk-toggle" data-checked={checked}>
    <Switch.Thumb className="toggle-thumb">{loading && <Loader2 size={12} className="animate-spin" />}</Switch.Thumb>
  </Switch.Root>;
}
