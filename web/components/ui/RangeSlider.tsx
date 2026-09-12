'use client';

import React from 'react';

interface RangeSliderProps {
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
        <label className="text-xs font-medium text-[#c1c7cd]">{label}</label>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#16181d] border border-[#262a33] text-indigo-400">
          {value}{unit}
        </span>
      </div>
      {description && <p className="text-[11px] text-[#717882]">{description}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-[#1a1d24] rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
      />
      <div className="flex justify-between text-[10px] text-[#555b64]">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
