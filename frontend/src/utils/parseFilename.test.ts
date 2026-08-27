import { describe, expect, it } from "vitest";
import { parseWeatherFilename } from "./parseFilename";

describe("parseWeatherFilename", () => {
  it("extracts latitude, longitude, and date range from a valid filename", () => {
    const result = parseWeatherFilename(
      "weather_51.5074_-0.1278_2026-07-01_2026-07-20_20260817T123456Z.json"
    );

    expect(result).toEqual({
      latitude: "51.5074",
      longitude: "-0.1278",
      startDate: "2026-07-01",
      endDate: "2026-07-20",
    });
  });

  it("returns null for a non-matching filename", () => {
    expect(parseWeatherFilename("not-a-weather-file.json")).toBeNull();
  });
});
