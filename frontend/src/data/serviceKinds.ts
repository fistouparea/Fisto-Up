import type { IconType } from 'react-icons';
import { LuPawPrint, LuTractor, LuUsers } from 'react-icons/lu';
import type { FlagKey } from '../api/flags';

/** Mirrors backend/src/config/serviceKinds.ts (ids, units, rules); keep in sync. Hindi type names live here too. */
import { SERVICE_KINDS, type ServiceKind, type ServiceSide } from './serviceKindIds';

export { SERVICE_KINDS, type ServiceKind, type ServiceSide };
export type PriceUnit = 'hour' | 'day' | 'bigha' | 'animal';

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = { hour: 'घंटा', day: 'दिन', bigha: 'बीघा', animal: 'पशु' };

export const EQUIPMENT_TYPES: Record<string, string> = {
  tractor: 'ट्रैक्टर',
  thresher: 'थ्रेशर',
  rotavator: 'रोटावेटर',
  sprayer: 'स्प्रेयर',
  seed_drill: 'सीड ड्रिल',
  harvester: 'हार्वेस्टर',
  trolley: 'ट्रॉली',
  cultivator: 'कल्टीवेटर',
  other: 'दूसरी मशीन',
};

export const LABOUR_SKILLS: Record<string, string> = {
  buvai: 'बुवाई',
  katai: 'कटाई',
  nirai: 'निराई-गुड़ाई',
  sinchai: 'सिंचाई',
  chhidkav: 'छिड़काव',
  thresher_kaam: 'थ्रेशर पर काम',
  pashu_seva: 'पशु सेवा',
  tractor_driver: 'ट्रैक्टर चलाना',
  other: 'दूसरा काम',
};

export const LIVESTOCK_ANIMALS: Record<string, string> = { cow: 'गाय', buffalo: 'भैंस', goat: 'बकरी', sheep: 'भेड़', camel: 'ऊँट' };
export const LIVESTOCK_PURPOSES = { dairy: 'दूध के लिए', farming: 'खेती/बोझा', breeding: 'नस्ल के लिए' } as const;

export interface KindInfo {
  flag: FlagKey;
  icon: IconType;
  types: Record<string, string>;
  sides: readonly ServiceSide[];
  priceUnits: readonly PriceUnit[];
  /** Bookings pick days from a calendar. */
  bookedByDate: boolean;
  needsApproval: boolean;
  maxPhotos: number;
}

export const SERVICE_KIND_INFO: Record<ServiceKind, KindInfo> = {
  equipment: { flag: 'equipment', icon: LuTractor, types: EQUIPMENT_TYPES, sides: ['offer'], priceUnits: ['hour', 'day', 'bigha'], bookedByDate: true, needsApproval: false, maxPhotos: 3 },
  labour: { flag: 'labour', icon: LuUsers, types: LABOUR_SKILLS, sides: ['offer', 'need'], priceUnits: ['day'], bookedByDate: true, needsApproval: false, maxPhotos: 1 },
  livestock: { flag: 'livestock', icon: LuPawPrint, types: LIVESTOCK_ANIMALS, sides: ['offer'], priceUnits: ['animal'], bookedByDate: false, needsApproval: true, maxPhotos: 4 },
};

export function typeLabel(kind: ServiceKind, typeId: string): string {
  return SERVICE_KIND_INFO[kind].types[typeId] ?? typeId;
}
