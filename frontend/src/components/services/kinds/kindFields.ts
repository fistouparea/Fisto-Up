import type { ServiceSide } from '../../../data/serviceKinds';

/** What every kind's fields edit in the new-listing form. */
export interface KindFieldsValue {
  typeId: string | null;
  skills: string[];
  details: Record<string, unknown>;
}

export interface KindFieldsProps {
  side: ServiceSide;
  value: KindFieldsValue;
  onChange: (value: KindFieldsValue) => void;
  showErrors: boolean;
}

/** Hindi message for what is missing in a kind's fields, or null when complete. */
export type KindFieldsCheck = (side: ServiceSide, value: KindFieldsValue) => string | null;
