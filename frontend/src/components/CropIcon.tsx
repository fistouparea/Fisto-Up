import type { ReactNode } from 'react';
import type { CropId } from '../api/types';
import { cn } from '../utils/cn';

/** Original, simple crop illustrations (64×64). Colors come from design tokens. */
const ILLUSTRATIONS: Record<CropId, ReactNode> = {
  // Bajra: tall brown spike full of grains
  bajra: (
    <>
      <path d="M32 60 V36" className="stroke-primary-600" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 50 C 24 46, 20 40, 18 34" className="stroke-primary-500" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="25" y="6" width="14" height="34" rx="7" className="fill-accent-700" />
      {[12, 18, 24, 30].map((y) => (
        <g key={y} className="fill-accent-300">
          <circle cx="29" cy={y} r="2" />
          <circle cx="35" cy={y + 3} r="2" />
        </g>
      ))}
    </>
  ),
  // Guar: cluster of slim green pods
  guar: (
    <>
      <path d="M32 6 V24" className="stroke-primary-700" strokeWidth="3" strokeLinecap="round" />
      {[-14, -5, 5, 14].map((dx, i) => (
        <path
          key={dx}
          d={`M32 22 C ${32 + dx} 30, ${32 + dx * 1.3} 44, ${32 + dx * 1.2} ${56 - (i % 2) * 6}`}
          className="stroke-primary-500"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <path d="M32 14 C 22 10, 14 12, 10 18 C 20 22, 28 20, 32 14 Z" className="fill-primary-400" />
    </>
  ),
  // Moong: small green beans
  moong: (
    <>
      {[
        [20, 22, -20],
        [40, 18, 25],
        [30, 34, 0],
        [16, 44, 30],
        [44, 40, -30],
        [30, 52, 15],
      ].map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="9" ry="6" transform={`rotate(${r} ${x} ${y})`} className="fill-primary-400 stroke-primary-700" strokeWidth="1.5" />
      ))}
    </>
  ),
  // Moth: small brown beans
  moth: (
    <>
      {[
        [20, 22, 20],
        [40, 18, -25],
        [30, 34, 0],
        [16, 44, -30],
        [44, 40, 30],
        [30, 52, -15],
      ].map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="8" ry="5.5" transform={`rotate(${r} ${x} ${y})`} className="fill-accent-700 stroke-accent-800" strokeWidth="1.5" />
      ))}
    </>
  ),
  // Chana: round beige chickpeas with a small beak
  chana: (
    <>
      {[
        [22, 24],
        [42, 22],
        [32, 40],
        [16, 46],
        [48, 44],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="9" className="fill-accent-200 stroke-accent-600" strokeWidth="2" />
          <path d={`M${(x ?? 0) + 3} ${(y ?? 0) - 9} l 3 -3`} className="stroke-accent-600" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </>
  ),
  // Sarson: yellow four-petal mustard flower
  sarson: (
    <>
      <path d="M32 60 V34" className="stroke-primary-600" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 50 C 40 48, 46 42, 48 36 C 40 36, 34 42, 32 50 Z" className="fill-primary-400" />
      {[0, 90, 180, 270].map((angle) => (
        <ellipse key={angle} cx="32" cy="12" rx="7" ry="10" transform={`rotate(${angle} 32 22)`} className="fill-accent-400 stroke-accent-600" strokeWidth="1.5" />
      ))}
      <circle cx="32" cy="22" r="5" className="fill-accent-700" />
    </>
  ),
  // Jeera: slim ridged cumin seeds
  jeera: (
    <>
      {[
        [18, 18, 35],
        [40, 14, -20],
        [28, 32, 60],
        [46, 34, 10],
        [18, 46, -35],
        [36, 52, 40],
      ].map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`rotate(${r} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx="11" ry="4" className="fill-accent-600" />
          <path d={`M${(x ?? 0) - 8} ${y} H ${(x ?? 0) + 8}`} className="stroke-accent-800" strokeWidth="1.2" />
        </g>
      ))}
    </>
  ),
  // Gehun: golden wheat ear
  gehun: (
    <>
      <path d="M32 62 V20" className="stroke-accent-600" strokeWidth="3" strokeLinecap="round" />
      {[14, 22, 30, 38].map((y) => (
        <g key={y} className="fill-accent-500">
          <ellipse cx="26" cy={y} rx="6" ry="4" transform={`rotate(-35 26 ${y})`} />
          <ellipse cx="38" cy={y} rx="6" ry="4" transform={`rotate(35 38 ${y})`} />
        </g>
      ))}
      <ellipse cx="32" cy="8" rx="4" ry="6" className="fill-accent-500" />
      <path d="M32 2 V-4 M26 10 L20 2 M38 10 L44 2" className="stroke-accent-600" strokeWidth="1.5" />
    </>
  ),
  // Other: a young sprout
  other: (
    <>
      <path d="M8 56 H56" className="stroke-accent-700" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 56 V30" className="stroke-primary-700" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 38 C 18 38, 10 28, 10 16 C 24 16, 32 24, 32 38 Z" className="fill-primary-400" />
      <path d="M32 32 C 46 32, 54 22, 54 10 C 40 10, 32 18, 32 32 Z" className="fill-primary-500" />
    </>
  ),
};

export function CropIcon({ crop, className }: { crop: CropId; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-16', className)} aria-hidden="true">
      {ILLUSTRATIONS[crop]}
    </svg>
  );
}
