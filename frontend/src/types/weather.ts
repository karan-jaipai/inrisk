export interface WeatherRequest {
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
}

export interface StoreWeatherResponse {
  status: "ok";
  file: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  created_at: string;
}

export interface ListFilesResponse {
  files: FileMetadata[];
}

export interface ApiErrorResponse {
  status: "error";
  message: string;
}

/** Raw Open-Meteo daily-history response shape, as stored verbatim in S3. */
export interface OpenMeteoDailyResponse {
  latitude?: number;
  longitude?: number;
  daily?: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    apparent_temperature_max: (number | null)[];
    apparent_temperature_min: (number | null)[];
  };
}

/** One row of the frontend's per-day transformation, used by both chart and table. */
export interface WeatherDayRow {
  date: string;
  temperatureMax: number | null;
  temperatureMin: number | null;
  apparentTemperatureMax: number | null;
  apparentTemperatureMin: number | null;
}
