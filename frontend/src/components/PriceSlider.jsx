import { useState, useCallback } from 'react';

const MIN = 1000;
const MAX = 30000;

export default function PriceSlider({ value, onChange }) {
  const pct = ((value - MIN) / (MAX - MIN)) * 100;

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{MIN.toLocaleString()} DA</span>
        <span className="font-semibold text-primary-600">{value.toLocaleString()} DA</span>
        <span>{MAX.toLocaleString()} DA</span>
      </div>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={500}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        style={{ '--pct': `${pct}%` }}
      />
    </div>
  );
}
