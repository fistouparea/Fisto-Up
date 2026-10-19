/**
 * Districts and tehsils the farmer can pick when GPS is not available.
 * Coordinates are the tehsil headquarters (approximate, used only for weather).
 * To add a district: append an entry with its tehsils. Names in Hindi, as farmers know them.
 * Note: verify the tehsil list with the district administration; new tehsils are added from time to time.
 */
export interface Tehsil {
  name: string;
  lat: number;
  lon: number;
}

export interface District {
  name: string;
  tehsils: Tehsil[];
}

export const DISTRICTS: District[] = [
  {
    name: 'चूरू',
    tehsils: [
      { name: 'चूरू', lat: 28.3, lon: 74.95 },
      { name: 'सरदारशहर', lat: 28.44, lon: 74.49 },
      { name: 'रतनगढ़', lat: 28.08, lon: 74.62 },
      { name: 'सुजानगढ़', lat: 27.7, lon: 74.47 },
      { name: 'तारानगर', lat: 28.67, lon: 75.03 },
      { name: 'राजगढ़ (सादुलपुर)', lat: 28.63, lon: 75.38 },
      { name: 'बीदासर', lat: 27.83, lon: 74.3 },
    ],
  },
];

/** Nearest listed tehsil to a GPS point (within ~60 km), to show a familiar place name. */
export function nearestTehsil(lat: number, lon: number): { district: string; tehsil: Tehsil } | null {
  let best: { district: string; tehsil: Tehsil; distance: number } | null = null;
  for (const district of DISTRICTS) {
    for (const tehsil of district.tehsils) {
      const distance = distanceKm(lat, lon, tehsil.lat, tehsil.lon);
      if (!best || distance < best.distance) best = { district: district.name, tehsil, distance };
    }
  }
  return best && best.distance <= 60 ? { district: best.district, tehsil: best.tehsil } : null;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
