import type { IconType } from 'react-icons';
import { LuCircleCheckBig, LuInfo, LuOctagonAlert, LuTriangleAlert } from 'react-icons/lu';

/** Meaning colors. Always used together with the matching icon, never color alone. */
export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

export const TONE_STYLES: Record<Tone, { soft: string; solid: string; text: string; border: string; icon: IconType }> = {
  success: {
    soft: 'bg-success-50',
    solid: 'bg-success-700 text-white',
    text: 'text-success-800',
    border: 'border-success-600/40',
    icon: LuCircleCheckBig,
  },
  warning: {
    soft: 'bg-warning-50',
    solid: 'bg-warning-400 text-ink-900',
    text: 'text-warning-800',
    border: 'border-warning-400',
    icon: LuTriangleAlert,
  },
  danger: {
    soft: 'bg-danger-50',
    solid: 'bg-danger-700 text-white',
    text: 'text-danger-800',
    border: 'border-danger-400/60',
    icon: LuOctagonAlert,
  },
  neutral: {
    soft: 'bg-surface-green',
    solid: 'bg-primary-700 text-white',
    text: 'text-primary-800',
    border: 'border-line',
    icon: LuInfo,
  },
};
