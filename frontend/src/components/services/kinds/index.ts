import type { ComponentType } from 'react';
import type { ServiceKind } from '../../../data/serviceKinds';
import { hi } from '../../../strings/hi';
import { hiF } from '../../../strings/hiFeatures';
import { EquipmentFields } from './EquipmentFields';
import type { KindFieldsCheck, KindFieldsProps } from './kindFields';
import { LabourFields } from './LabourFields';
import { LivestockFields } from './LivestockFields';

/** The one place where the generic service form plugs in each kind's own fields and checks. */
export const KIND_FIELDS: Record<ServiceKind, { Fields: ComponentType<KindFieldsProps>; check: KindFieldsCheck }> = {
  equipment: { Fields: EquipmentFields, check: (_side, value) => (value.typeId ? null : hiF.services.type) },
  labour: {
    Fields: LabourFields,
    check: (side, value) => (value.skills.length === 0 ? hiF.services.skills : side === 'offer' && value.details.ageConfirmed18 !== true ? hiF.services.labour.ageRequired : null),
  },
  livestock: {
    Fields: LivestockFields,
    check: (_side, { typeId, details }) =>
      !typeId ? hiF.services.type : typeof details.breed !== 'string' || !details.breed.trim() || details.ageYears === undefined || !details.purpose ? hi.sellerProfile.required : null,
  },
};
