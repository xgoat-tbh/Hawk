'use client';

import React from 'react';

interface RangeSliderProps {
  id?: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
}

export function RangeSlider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  description,
}: RangeSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-text-primary dark:text-text-secondary">{label}</label>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-[#16181d] border border-indigo-200 dark:border-[#262a33] text-info-text dark:text-info-text">
          {value}{unit}
        </span>
      </div>
      {description && <p className="text-[11px] text-slate-500 dark:text-text-muted">{description}</p>}
      <input
        id={id} type="range" aria-label={label} aria-valuetext={`${value}${unit}`}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 dark:bg-border rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500 hover:accent-indigo-500"
      />
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-text-muted">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
