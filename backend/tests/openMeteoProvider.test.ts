import { describe, expect, it, vi } from 'vitest';
import { OpenMeteoProvider } from '../src/services/weather/openMeteoProvider.js';

const NOW = new Date('2026-11-10T04:00:00Z'); // 09:30 in India

function openMeteoBody(overrides: Record<string, (number | null)[]> = {}) {
  const time = ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
  return {
    current: { temperature_2m: 24, weather_code: 1, wind_speed_10m: 6 },
    daily: {
      time,
      weather_code: [0, 61, 0, 2, 95],
      temperature_2m_max: [30, 29, 31, 32, 28],
      temperature_2m_min: [14, 15, 16, 17, 18],
      precipitation_sum: [0, 12, 0, null, 30],
      precipitation_probability_max: [0, 80, 5, null, 90],
      wind_speed_10m_max: [10, 12, 14, 9, 30],
      wind_gusts_10m_max: [20, 25, 28, 18, 60],
      et0_fao_evapotranspiration: [4, 3, 4.5, null, 2],
      ...overrides,
    },
  };
}

function setup(body: unknown = openMeteoBody(), status = 200) {
  let now = NOW;
  const fetchFn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  const provider = new OpenMeteoProvider({ fetchFn, now: () => now, cacheTtlMs: 60_000 });
  return { provider, fetchFn, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe('OpenMeteoProvider', () => {
  it('splits past rain from today and the coming days, replacing missing values safely', async () => {
    const { provider, fetchFn } = setup();
    const forecast = await provider.getForecast(28.3046, 74.9671);

    expect(forecast.past).toEqual([
      { date: '2026-11-08', rainMm: 0 },
      { date: '2026-11-09', rainMm: 12 },
    ]);
    expect(forecast.days.map((day) => day.date)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    expect(forecast.days[1]).toMatchObject({ rainMm: 0, rainChance: 0, et0: null });
    expect(forecast.days[2]).toMatchObject({ weatherCode: 95, rainMm: 30, gustMax: 60 });
    expect(forecast.current).toEqual({ temperature: 24, weatherCode: 1, windSpeed: 6 });
    expect(forecast.fetchedAt).toBe(NOW.toISOString());

    const url = new URL(String((fetchFn.mock.calls[0] as unknown as [string])[0]));
    expect(url.searchParams.get('latitude')).toBe('28.30');
    expect(url.searchParams.get('timezone')).toBe('Asia/Kolkata');
    expect(url.searchParams.get('past_days')).toBe('7');
  });

  it('skips days without temperatures', async () => {
    const { provider } = setup(openMeteoBody({ temperature_2m_max: [30, 29, 31, null, 28] }));
    const forecast = await provider.getForecast(28.3, 74.95);
    expect(forecast.days.map((day) => day.date)).toEqual(['2026-11-10', '2026-11-12']);
  });

  it('caches per location for the TTL, then fetches again', async () => {
    const { provider, fetchFn, advance } = setup();
    await provider.getForecast(28.3, 74.95);
    await provider.getForecast(28.301, 74.949); // same ~1 km cell
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await provider.getForecast(28.44, 74.49); // another place
    expect(fetchFn).toHaveBeenCalledTimes(2);

    advance(61_000);
    await provider.getForecast(28.3, 74.95);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('serves the last good copy when the service fails later', async () => {
    const { provider, fetchFn, advance } = setup();
    const first = await provider.getForecast(28.3, 74.95);
    fetchFn.mockImplementation(async () => new Response('down', { status: 503 }));
    advance(61_000);
    await expect(provider.getForecast(28.3, 74.95)).resolves.toEqual(first);
  });

  it.each([
    ['HTTP error', () => new Response('down', { status: 500 })],
    ['unexpected JSON', () => new Response(JSON.stringify({ hello: 1 }))],
  ])('throws WEATHER_UNAVAILABLE on %s with nothing cached', async (_label, respond) => {
    const provider = new OpenMeteoProvider({ fetchFn: vi.fn(async () => respond()), now: () => NOW });
    await expect(provider.getForecast(28.3, 74.95)).rejects.toMatchObject({ code: 'WEATHER_UNAVAILABLE' });
  });

  it('throws WEATHER_UNAVAILABLE on network errors and timeouts', async () => {
    const provider = new OpenMeteoProvider({
      fetchFn: vi.fn(async () => {
        throw new DOMException('timed out', 'TimeoutError');
      }),
      now: () => NOW,
    });
    await expect(provider.getForecast(28.3, 74.95)).rejects.toMatchObject({ code: 'WEATHER_UNAVAILABLE' });
  });
});
