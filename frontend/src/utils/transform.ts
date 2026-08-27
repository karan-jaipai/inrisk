import type { OpenMeteoDailyResponse, WeatherDayRow } from "../types/weather";

export function transformDailyData(raw: OpenMeteoDailyResponse): WeatherDayRow[] {
  const daily = raw.daily;
  if (!daily || !Array.isArray(daily.time)) return [];

  return daily.time.map((date, i) => ({
    date,
    temperatureMax: daily.temperature_2m_max?.[i] ?? null,
    temperatureMin: daily.temperature_2m_min?.[i] ?? null,
    apparentTemperatureMax: daily.apparent_temperature_max?.[i] ?? null,
    apparentTemperatureMin: daily.apparent_temperature_min?.[i] ?? null,
  }));
}
