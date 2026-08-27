import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeatherDayRow } from "../types/weather";

interface WeatherChartProps {
  rows: WeatherDayRow[];
}

function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number | null;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-gray-900">{label ? formatShortDate(label) : ""}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value !== null ? `${entry.value}°C` : "—"}
        </p>
      ))}
    </div>
  );
}

export default function WeatherChart({ rows }: WeatherChartProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">No daily weather data available.</p>;
  }

  return (
    <div className="h-72 w-full" role="img" aria-label="Daily maximum and minimum temperature chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="#f1f3f6" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
            unit="°C"
            label={{ value: "Temperature (°C)", angle: -90, position: "insideLeft", fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="temperatureMax"
            name="Max Temperature (°C)"
            stroke="#0f863c"
            strokeWidth={2}
            dot={{ r: rows.length === 1 ? 4 : 2 }}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="temperatureMin"
            name="Min Temperature (°C)"
            stroke="#0873d7"
            strokeWidth={2}
            dot={{ r: rows.length === 1 ? 4 : 2 }}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
