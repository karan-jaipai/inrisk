import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FileList from "./FileList";

const sampleFiles = [
  { name: "weather_51.5_-0.1_2026-07-01_2026-07-02_20260817T000000Z.json", size: 1024, created_at: new Date().toISOString() },
];

describe("FileList", () => {
  it("shows the empty state when there are no files", () => {
    render(
      <FileList
        files={[]}
        selectedFile={null}
        onSelect={vi.fn()}
        onDownload={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText(/no stored weather files yet/i)).toBeInTheDocument();
  });

  it("calls onSelect when a file is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <FileList
        files={sampleFiles}
        selectedFile={null}
        onSelect={onSelect}
        onDownload={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={false}
        error={null}
      />
    );

    await user.click(screen.getByText(sampleFiles[0].name));

    expect(onSelect).toHaveBeenCalledWith(sampleFiles[0].name);
  });

  it("shows an error message when loading fails", () => {
    render(
      <FileList
        files={[]}
        selectedFile={null}
        onSelect={vi.fn()}
        onDownload={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={false}
        error="Unable to read weather data"
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Unable to read weather data");
  });
});
