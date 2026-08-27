import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import WeatherForm from "./WeatherForm";
import * as weatherApi from "../services/weatherApi";

afterEach(() => {
  vi.restoreAllMocks();
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Latitude"), "51.5074");
  await user.type(screen.getByLabelText("Longitude"), "-0.1278");
  await user.type(screen.getByLabelText("Start date"), "2026-07-01");
  await user.type(screen.getByLabelText("End date"), "2026-07-02");
}

describe("WeatherForm", () => {
  it("shows a validation error and does not call the API for an out-of-range latitude", async () => {
    const storeSpy = vi.spyOn(weatherApi, "storeWeatherData");
    const user = userEvent.setup();
    render(<WeatherForm onStored={vi.fn()} />);

    await user.type(screen.getByLabelText("Latitude"), "200");
    await user.type(screen.getByLabelText("Longitude"), "-0.1278");
    await user.click(screen.getByRole("button", { name: /fetch & store data/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/latitude must be/i);
    expect(storeSpy).not.toHaveBeenCalled();
  });

  it("disables the submit button and shows a loading message while submitting", async () => {
    vi.spyOn(weatherApi, "storeWeatherData").mockImplementation(
      () => new Promise(() => {}) // never resolves, keeps it in "loading"
    );
    const user = userEvent.setup();
    render(<WeatherForm onStored={vi.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /fetch & store data/i }));

    const button = await screen.findByRole("button", { name: /fetching and storing/i });
    expect(button).toBeDisabled();
  });

  it("shows the stored filename on success and calls onStored", async () => {
    vi.spyOn(weatherApi, "storeWeatherData").mockResolvedValue({
      status: "ok",
      file: "weather_51.5074_-0.1278_2026-07-01_2026-07-02_20260817T000000Z.json",
    });
    const onStored = vi.fn();
    const user = userEvent.setup();
    render(<WeatherForm onStored={onStored} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /fetch & store data/i }));

    expect(await screen.findByText(/data stored successfully/i)).toBeInTheDocument();
    await waitFor(() => expect(onStored).toHaveBeenCalledWith(expect.stringContaining("weather_")));
  });

  it("shows the API's error message on failure", async () => {
    vi.spyOn(weatherApi, "storeWeatherData").mockRejectedValue(
      new weatherApi.ApiError("Unable to fetch weather data")
    );
    const user = userEvent.setup();
    render(<WeatherForm onStored={vi.fn()} />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /fetch & store data/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to fetch weather data");
  });
});
