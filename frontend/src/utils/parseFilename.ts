export interface ParsedFilename {
  latitude: string;
  longitude: string;
  startDate: string;
  endDate: string;
}

const FILENAME_PATTERN =
  /^weather_(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})_\d{8}T\d{6}Z\.json$/;

export function parseWeatherFilename(filename: string): ParsedFilename | null {
  const match = filename.match(FILENAME_PATTERN);
  if (!match) return null;

  const [, latitude, longitude, startDate, endDate] = match;
  return { latitude, longitude, startDate, endDate };
}
