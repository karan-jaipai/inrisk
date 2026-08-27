import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import WeatherTable from "./WeatherTable";
import type { WeatherDayRow } from "../types/weather";

function makeRows(count: number): WeatherDayRow[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `2026-07-${String(i + 1).padStart(2, "0")}`,
    temperatureMax: 20 + i,
    temperatureMin: 10 + i,
    apparentTemperatureMax: 19 + i,
    apparentTemperatureMin: 9 + i,
  }));
}

describe("WeatherTable", () => {
  it("shows the empty state for zero rows", () => {
    render(<WeatherTable rows={[]} />);
    expect(screen.getByText(/no daily weather data available/i)).toBeInTheDocument();
  });

  it("shows only the first page of rows by default (10 per page)", () => {
    render(<WeatherTable rows={makeRows(25)} />);
    expect(screen.getByText(/showing 1 to 10 of 25 entries/i)).toBeInTheDocument();
  });

  it("shows more rows per page when changed to 20", async () => {
    const user = userEvent.setup();
    render(<WeatherTable rows={makeRows(25)} />);

    await user.selectOptions(screen.getByLabelText(/rows per page/i), "20");

    expect(screen.getByText(/showing 1 to 20 of 25 entries/i)).toBeInTheDocument();
  });

  it("navigates to the next page", async () => {
    const user = userEvent.setup();
    render(<WeatherTable rows={makeRows(25)} />);

    await user.click(screen.getByRole("button", { name: /next page/i }));

    expect(screen.getByText(/showing 11 to 20 of 25 entries/i)).toBeInTheDocument();
  });
});
