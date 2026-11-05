/** Service kind ids only (no icons or names), for the router and the home tiles. Mirrors backend/src/config/serviceKinds.ts. */
export const SERVICE_KINDS = ['equipment', 'labour', 'livestock'] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];
export type ServiceSide = 'offer' | 'need';
