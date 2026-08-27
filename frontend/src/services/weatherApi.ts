import type {
  ApiErrorResponse,
  ListFilesResponse,
  OpenMeteoDailyResponse,
  StoreWeatherResponse,
  WeatherRequest,
} from "../types/weather";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
  } catch {
    throw new ApiError("Network error. Check your connection and try again.");
  }

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const body = (await response.json()) as ApiErrorResponse | { detail?: unknown };
      if ("message" in body && typeof body.message === "string") {
        message = body.message;
      } else if ("detail" in body) {
        message = "Please check your input and try again.";
      }
    } catch {
      // response body wasn't JSON; fall back to the generic message above
    }
    throw new ApiError(message);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("Received an unexpected response from the server.");
  }
}

export function storeWeatherData(payload: WeatherRequest): Promise<StoreWeatherResponse> {
  return request<StoreWeatherResponse>("/store-weather-data", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listWeatherFiles(): Promise<ListFilesResponse> {
  return request<ListFilesResponse>("/list-weather-files");
}

export function getWeatherFile(filename: string): Promise<OpenMeteoDailyResponse> {
  return request<OpenMeteoDailyResponse>(`/weather-file-content/${encodeURIComponent(filename)}`);
}
