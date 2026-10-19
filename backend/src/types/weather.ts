/** One forecast day (India date). Rain in mm, wind in km/h, temperature in °C, et0 in mm/day. */
export interface DayWeather {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  /** 0–100 */
  rainChance: number;
  windMax: number;
  gustMax: number;
  /** Reference evapotranspiration (FAO-56). null if the service did not provide it. */
  et0: number | null;
}

export interface Forecast {
  /** When the data was fetched from the weather service (ISO). */
  fetchedAt: string;
  current: { temperature: number; weatherCode: number; windSpeed: number } | null;
  /** Today first, then the next 7 days. */
  days: DayWeather[];
  /** Rain of the last 7 days, oldest first. */
  past: { date: string; rainMm: number }[];
}

export type AlertType = 'heatwave' | 'frost' | 'heavyRain' | 'strongWind' | 'drySpell';

export interface WeatherAlert {
  type: AlertType;
  severity: 'warning' | 'danger';
  /** First day the condition is expected. */
  date: string;
  title: string;
  /** Short Hindi line with the number that triggered it, e.g. "45°C तक गर्मी". */
  detail: string;
  advice: string[];
}
