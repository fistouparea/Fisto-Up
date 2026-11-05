import { LABOUR_SKILLS } from '../../../data/serviceKinds';
import { hi } from '../../../strings/hi';
import { hiF } from '../../../strings/hiFeatures';
import { Chip } from '../../ui/Chip';
import { NumberStepper } from '../../ui/NumberStepper';
import type { KindFieldsProps } from './kindFields';

/** मज़दूर: the skills; a worker confirms 18+, a farmer's work need says how many workers. */
export function LabourFields({ side, value, onChange, showErrors }: KindFieldsProps) {
  const toggle = (skill: string) => {
    const skills = value.skills.includes(skill) ? value.skills.filter((item) => item !== skill) : [...value.skills, skill].slice(0, 6);
    onChange({ ...value, skills, typeId: skills[0] ?? null });
  };
  const adult = value.details.ageConfirmed18 === true;
  const workers = typeof value.details.workersNeeded === 'number' ? value.details.workersNeeded : 1;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-bold">{hiF.services.skills}</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(LABOUR_SKILLS).map(([id, label]) => (
          <Chip key={id} label={label} selected={value.skills.includes(id)} onClick={() => toggle(id)} />
        ))}
      </div>
      {showErrors && value.skills.length === 0 && <p className="font-bold text-danger-700">{hiF.services.skills}</p>}
      {side === 'offer' ? (
        <>
          <label className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-line p-3 text-lg font-bold">
            <input type="checkbox" className="size-7" checked={adult} onChange={(event) => onChange({ ...value, details: { ...value.details, ageConfirmed18: event.target.checked } })} />
            {hiF.services.labour.ageConfirm}
          </label>
          {showErrors && !adult && <p className="font-bold text-danger-700">{hiF.services.labour.ageRequired}</p>}
        </>
      ) : (
        <>
          <h3 className="text-lg font-bold">{hiF.services.labour.workersNeeded}</h3>
          <NumberStepper
            value={workers}
            min={1}
            max={50}
            onChange={(next) => onChange({ ...value, details: { ...value.details, workersNeeded: next ?? 1 } })}
            label={hiF.services.labour.workersNeeded}
            unitLabel=""
            lessLabel={hi.sell.less}
            moreLabel={hi.sell.more}
          />
        </>
      )}
    </div>
  );
}
