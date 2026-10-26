import { LuTractor } from 'react-icons/lu';
import { EQUIPMENT_TYPES } from '../../../data/serviceKinds';
import { hi } from '../../../strings/hi';
import { Chip } from '../../ui/Chip';
import { SelectCard } from '../../ui/SelectCard';
import type { KindFieldsProps } from './kindFields';

/** किराए पर मशीन: which machine, and whether a driver comes with it. */
export function EquipmentFields({ value, onChange, showErrors }: KindFieldsProps) {
  const withOperator = value.details.withOperator !== false;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-bold">{hi.services.type}</h3>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(EQUIPMENT_TYPES).map(([id, label]) => (
          <SelectCard key={id} icon={LuTractor} label={label} selected={value.typeId === id} onClick={() => onChange({ ...value, typeId: id })} className="min-h-24 text-base" />
        ))}
      </div>
      {showErrors && !value.typeId && <p className="font-bold text-danger-700">{hi.services.type}</p>}
      <div className="flex flex-wrap gap-2">
        <Chip label={hi.services.equipment.withOperator} selected={withOperator} onClick={() => onChange({ ...value, details: { ...value.details, withOperator: true } })} />
        <Chip label={hi.services.equipment.noOperator} selected={!withOperator} onClick={() => onChange({ ...value, details: { ...value.details, withOperator: false } })} />
      </div>
    </div>
  );
}
