import { getDeviceId } from '../utils/deviceId';
import { isRecord, requestApi } from './client';
import type { WeatherResponse } from './types';

export function fetchWeather(): Promise<WeatherResponse> {
  const query = new URLSearchParams({ deviceId: getDeviceId() });
  return requestApi(`/api/weather?${query}`, { method: 'GET' }, isWeatherResponse);
}

function isWeatherResponse(body: unknown): body is WeatherResponse {
  return (
    isRecord(body) &&
    Array.isArray(body.alerts) &&
    (body.forecast === null || (isRecord(body.forecast) && Array.isArray(body.forecast.days)))
  );
}
