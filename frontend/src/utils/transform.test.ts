import { describe, expect, it } from "vitest";
import { transformDailyData } from "./transform";

describe("transformDailyData", () => {
  it("maps raw Open-Meteo daily arrays into per-day rows", () => {
    const raw = {
      daily: {
        time: ["2026-07-01", "2026-07-02"],
        temperature_2m_max: [22.1, 23.4],
        temperature_2m_min: [14.2, 15.1],
        apparent_temperature_max: [21.0, 22.5],
        apparent_temperature_min: [13.0, 14.0],
      },
    };

    expect(transformDailyData(raw)).toEqual([
      {
        date: "2026-07-01",
        temperatureMax: 22.1,
        temperatureMin: 14.2,
        apparentTemperatureMax: 21.0,
        apparentTemperatureMin: 13.0,
      },
      {
        date: "2026-07-02",
        temperatureMax: 23.4,
        temperatureMin: 15.1,
        apparentTemperatureMax: 22.5,
        apparentTemperatureMin: 14.0,
      },
    ]);
  });

  it("returns an empty array when daily data is missing", () => {
    expect(transformDailyData({})).toEqual([]);
  });

  it("handles a single-day dataset", () => {
    const raw = {
      daily: {
        time: ["2026-07-01"],
        temperature_2m_max: [22.1],
        temperature_2m_min: [14.2],
        apparent_temperature_max: [21.0],
        apparent_temperature_min: [13.0],
      },
    };

    expect(transformDailyData(raw)).toHaveLength(1);
  });

  it("fills missing values with null rather than throwing", () => {
    const raw = {
      daily: {
        time: ["2026-07-01"],
        temperature_2m_max: [22.1],
        temperature_2m_min: [],
        apparent_temperature_max: [21.0],
        apparent_temperature_min: [13.0],
      },
    };

    expect(transformDailyData(raw)[0].temperatureMin).toBeNull();
  });
});
