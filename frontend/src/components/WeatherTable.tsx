import { useMemo, useState } from "react";
import type { WeatherDayRow } from "../types/weather";

interface WeatherTableProps {
  rows: WeatherDayRow[];
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function formatCell(value: number | null): string {
  return value === null ? "—" : String(value);
}

function formatDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export default function WeatherTable({ rows }: WeatherTableProps) {
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">No daily weather data available.</p>;
  }

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, rows.length);

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th scope="col" className="py-2 pr-4 font-medium">
                Date
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Max Temp (°C)
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Apparent Max Temp (°C)
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Min Temp (°C)
              </th>
              <th scope="col" className="py-2 font-medium">
                Apparent Min Temp (°C)
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.date} className="border-b border-gray-100 text-gray-800">
                <td className="py-2 pr-4">{formatDisplayDate(row.date)}</td>
                <td className="py-2 pr-4">{formatCell(row.temperatureMax)}</td>
                <td className="py-2 pr-4">{formatCell(row.apparentTemperatureMax)}</td>
                <td className="py-2 pr-4">{formatCell(row.temperatureMin)}</td>
                <td className="py-2">{formatCell(row.apparentTemperatureMin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          Showing {startIndex} to {endIndex} of {rows.length} entries
        </p>

        <div className="flex items-center gap-3">
          <label htmlFor="rows-per-page" className="text-xs text-gray-500">
            Rows per page:
          </label>
          <select
            id="rows-per-page"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <nav aria-label="Table pagination" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              aria-label="First page"
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-40"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => goToPage(pageNumber)}
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={`rounded-lg px-2.5 py-1 text-xs ${
                  pageNumber === currentPage
                    ? "bg-brand-500 text-white"
                    : "border border-gray-300 text-gray-600"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-40"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Last page"
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-40"
            >
              »
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
