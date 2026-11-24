"use client";

import React, { useState } from 'react';

interface NumericDraftInputProps {
  id?: string;
  value: number;
  onCommit: (nextValue: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
  fallbackValue?: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export default function NumericDraftInput({
  id,
  value,
  onCommit,
  min = 0,
  max = 100,
  step = '1',
  fallbackValue,
  disabled = false,
  ariaLabel,
  className = ''
}: NumericDraftInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState<string>('');

  const handleFocus = () => {
    setIsFocused(true);
    setDraft(String(value));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);

    const normalized = raw.trim().replace(',', '.');
    if (normalized === '') return;

    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      onCommit(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalized = draft.trim().replace(',', '.');
    if (normalized === '') {
      const fb = fallbackValue !== undefined ? fallbackValue : min;
      onCommit(Math.min(max, Math.max(min, fb)));
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      const fb = fallbackValue !== undefined ? fallbackValue : value;
      onCommit(Math.min(max, Math.max(min, fb)));
      return;
    }
    onCommit(Math.min(max, Math.max(min, parsed)));
  };

  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
      value={isFocused ? draft : value}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
}
