import { LuMinus, LuPlus, LuRuler } from 'react-icons/lu';
import { IRRIGATION_SOURCES, type IrrigationSource } from '../../api/types';
import { IRRIGATION_OPTIONS } from '../../data/irrigation';
import { hi } from '../../strings/hi';
import { Chip } from '../ui/Chip';
import { IconButton } from '../ui/IconButton';
import { PageHeader } from '../ui/PageHeader';
import { SelectCard } from '../ui/SelectCard';

const QUICK_SIZES = [1, 2, 5, 10, 20];

interface FieldStepProps {
  size: number | undefined;
  irrigation: IrrigationSource | undefined;
  onSizeChange: (size: number | undefined) => void;
  onIrrigationChange: (irrigation: IrrigationSource) => void;
}

export function FieldStep({ size, irrigation, onSizeChange, onIrrigationChange }: FieldStepProps) {
  const step = (delta: number) => onSizeChange(Math.max(1, (size ?? 0) + delta));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={hi.farm.field.sizeQuestion} icon={LuRuler} />
      <div className="flex items-center justify-center gap-4 rounded-3xl border border-line bg-surface p-4 shadow-card">
        <IconButton icon={LuMinus} label={hi.farm.field.less} tone="soft" size="lg" onClick={() => step(-1)} disabled={!size || size <= 1} />
        <div className="min-w-24 text-center">
          <p className="text-4xl font-bold text-ink-900">{size ?? '—'}</p>
          <p className="text-lg text-ink-500">{hi.farm.field.bigha}</p>
        </div>
        <IconButton icon={LuPlus} label={hi.farm.field.more} tone="soft" size="lg" onClick={() => step(1)} />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_SIZES.map((option) => (
          <Chip key={option} label={`${option} ${hi.farm.field.bigha}`} selected={size === option} onClick={() => onSizeChange(option)} />
        ))}
      </div>

      <PageHeader title={hi.farm.field.irrigationQuestion} />
      <div className="grid grid-cols-2 gap-3">
        {IRRIGATION_SOURCES.map((source) => (
          <SelectCard
            key={source}
            icon={IRRIGATION_OPTIONS[source].icon}
            label={IRRIGATION_OPTIONS[source].label}
            selected={irrigation === source}
            onClick={() => onIrrigationChange(source)}
          />
        ))}
      </div>
    </div>
  );
}
