import { LuSprout } from 'react-icons/lu';
import type { CropId, FarmCrop } from '../../api/types';
import { cropLabels, hi } from '../../strings/hi';
import { addDays, daysBetween, todayInIndia } from '../../utils/indiaDate';
import { CropGrid } from '../CropGrid';
import { CropIcon } from '../CropIcon';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { PageHeader } from '../ui/PageHeader';

interface CropsStepProps {
  value: FarmCrop[];
  onChange: (crops: FarmCrop[]) => void;
}

export function CropsStep({ value, onChange }: CropsStepProps) {
  const today = todayInIndia();

  const toggle = (crop: CropId) =>
    onChange(
      value.some((entry) => entry.crop === crop)
        ? value.filter((entry) => entry.crop !== crop)
        : [...value, { crop, sowingDate: addDays(today, -14) }],
    );

  const setSowingDate = (crop: CropId, sowingDate: string) =>
    onChange(value.map((entry) => (entry.crop === crop ? { ...entry, sowingDate } : entry)));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={hi.farm.crops.question} icon={LuSprout} />
      <CropGrid selected={value.map((entry) => entry.crop)} onSelect={toggle} />

      {value.map((entry) => (
        <SowingDateCard key={entry.crop} entry={entry} today={today} onChange={(date) => setSowingDate(entry.crop, date)} />
      ))}
    </div>
  );
}

interface SowingDateCardProps {
  entry: FarmCrop;
  today: string;
  onChange: (date: string) => void;
}

function SowingDateCard({ entry, today, onChange }: SowingDateCardProps) {
  const daysAgo = daysBetween(entry.sowingDate, today);
  const label = cropLabels[entry.crop].hindi;
  const title = `${label} — ${hi.farm.crops.sownWhen}`;

  return (
    <Card tone="neutral" title={title} speakText={title}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <CropIcon crop={entry.crop} className="size-12" />
          <p className="text-xl font-bold">
            {daysAgo === 0 ? hi.farm.crops.today : `${daysAgo} ${hi.farm.crops.ago}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hi.farm.crops.quickAgo.map((option) => (
            <Chip
              key={option.days}
              label={option.label}
              selected={daysAgo === option.days}
              onClick={() => onChange(addDays(today, -option.days))}
            />
          ))}
        </div>
        <label className="flex flex-col gap-1 text-base text-ink-700">
          {hi.farm.crops.exactDate}
          <input
            type="date"
            value={entry.sowingDate}
            min={addDays(today, -365)}
            max={today}
            onChange={(event) => event.target.value && onChange(event.target.value)}
            className="min-h-14 rounded-2xl border-2 border-ink-500/40 bg-surface px-4 text-lg text-ink-900 focus:border-primary-700 focus:outline-none"
          />
        </label>
      </div>
    </Card>
  );
}
