import { useState, type FormEvent } from "react";
import { ApiError, storeWeatherData } from "../services/weatherApi";

const MAX_RANGE_DAYS = 31;

interface WeatherFormProps {
  onStored: (filename: string) => void;
}

interface FormState {
  latitude: string;
  longitude: string;
  startDate: string;
  endDate: string;
}

function validate(form: FormState): string | null {
  const lat = Number(form.latitude);
  const lon = Number(form.longitude);

  if (form.latitude.trim() === "" || Number.isNaN(lat) || lat < -90 || lat > 90) {
    return "Latitude must be a number between -90 and 90.";
  }
  if (form.longitude.trim() === "" || Number.isNaN(lon) || lon < -180 || lon > 180) {
    return "Longitude must be a number between -180 and 180.";
  }
  if (!form.startDate || !form.endDate) {
    return "Start and end dates are required.";
  }

  const start = new Date(form.startDate);
  const end = new Date(form.endDate);
  if (start > end) {
    return "Start date must be on or before the end date.";
  }

  const rangeDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (rangeDays > MAX_RANGE_DAYS) {
    return `Date range cannot exceed ${MAX_RANGE_DAYS} days.`;
  }

  return null;
}

export default function WeatherForm({ onStored }: WeatherFormProps) {
  const [form, setForm] = useState<FormState>({
    latitude: "",
    longitude: "",
    startDate: "",
    endDate: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [storedFile, setStoredFile] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validationError = validate(form);
    if (validationError) {
      setStatus("error");
      setMessage(validationError);
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const result = await storeWeatherData({
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        start_date: form.startDate,
        end_date: form.endDate,
      });
      setStatus("success");
      setStoredFile(result.file);
      onStored(result.file);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Unable to fetch weather data.");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 border-l-2 border-brand-500 pl-2 text-sm font-medium text-gray-900">
        Query data
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="latitude" className="mb-1 block text-xs text-gray-500">
              Latitude
            </label>
            <input
              id="latitude"
              type="text"
              inputMode="decimal"
              placeholder="51.5074"
              value={form.latitude}
              onChange={(e) => updateField("latitude", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="longitude" className="mb-1 block text-xs text-gray-500">
              Longitude
            </label>
            <input
              id="longitude"
              type="text"
              inputMode="decimal"
              placeholder="-0.1278"
              value={form.longitude}
              onChange={(e) => updateField("longitude", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start-date" className="mb-1 block text-xs text-gray-500">
              Start date
            </label>
            <input
              id="start-date"
              type="date"
              value={form.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="mb-1 block text-xs text-gray-500">
              End date
            </label>
            <input
              id="end-date"
              type="date"
              value={form.endDate}
              onChange={(e) => updateField("endDate", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {!isLoading && (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path
                d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.3 8.06 4.5 4.5 0 0 1 17 17H7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {isLoading ? "Fetching and storing weather data..." : "Fetch & Store Data"}
        </button>
      </form>

      {status === "success" && storedFile && (
        <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          <p className="font-medium">Data stored successfully!</p>
          <p className="mt-0.5 break-all text-xs text-brand-600">File: {storedFile}</p>
        </div>
      )}

      {status === "error" && message && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {message}
        </div>
      )}
    </div>
  );
}
