import { useEffect, useState } from "react";
import WeatherForm from "./components/WeatherForm";
import FileList from "./components/FileList";
import WeatherChart from "./components/WeatherChart";
import WeatherTable from "./components/WeatherTable";
import LoadingState from "./components/LoadingState";
import ErrorMessage from "./components/ErrorMessage";
import { ApiError, getWeatherFile, listWeatherFiles } from "./services/weatherApi";
import { downloadJson } from "./utils/download";
import { transformDailyData } from "./utils/transform";
import { parseWeatherFilename } from "./utils/parseFilename";
import type { FileMetadata, WeatherDayRow } from "./types/weather";

function App() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [rows, setRows] = useState<WeatherDayRow[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  async function refreshFiles() {
    setFilesLoading(true);
    setFilesError(null);
    try {
      const result = await listWeatherFiles();
      setFiles(result.files);
    } catch (err) {
      setFilesError(err instanceof ApiError ? err.message : "Unable to load stored files.");
    } finally {
      setFilesLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: no data-fetching library is used here by design (see
    // architecture notes on avoiding unnecessary dependencies), so this is the
    // simplest correct way to load the file list once when the app starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshFiles();
  }, []);

  useEffect(() => {
    // Synchronizes fetched content with the selected file (an external system -
    // S3 via the API), including clearing state when the selection is cleared.
    if (!selectedFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([]);
      setContentError(null);
      return;
    }

    let cancelled = false;
    setContentLoading(true);
    setContentError(null);

    getWeatherFile(selectedFile)
      .then((raw) => {
        if (cancelled) return;
        setRows(transformDailyData(raw));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setContentError(err instanceof ApiError ? err.message : "Unable to load weather data.");
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  async function handleStored(filename: string) {
    await refreshFiles();
    setSelectedFile(filename);
  }

  async function handleDownload(filename: string) {
    try {
      const content = await getWeatherFile(filename);
      downloadJson(filename, content);
    } catch {
      // Download is a convenience action; a silent failure here doesn't block the
      // main flow, and the same content is already viewable via file selection.
    }
  }

  const parsedMeta = selectedFile ? parseWeatherFilename(selectedFile) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <header className="mb-6 flex items-center gap-2 border-b border-gray-200 pb-3">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand-500" fill="currentColor" aria-hidden="true">
          <path d="M12 3c-4 2-7 5-7 9a7 7 0 0 0 14 0c0-4-3-7-7-9z" />
        </svg>
        <div>
          <h1 className="text-lg font-medium text-gray-900">Weather Explorer</h1>
          <p className="text-xs text-gray-500">Historical weather data explorer</p>
        </div>
      </header>

      <div className="grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <WeatherForm onStored={handleStored} />
          <FileList
            files={files}
            selectedFile={selectedFile}
            onSelect={setSelectedFile}
            onDownload={handleDownload}
            onRefresh={refreshFiles}
            isLoading={filesLoading}
            error={filesError}
          />
        </div>

        <div className="space-y-4">
          {!selectedFile && (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              Fetch some data or select a stored file to get started.
            </div>
          )}

          {selectedFile && (
            <>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 sm:text-sm">
                <span className="font-medium text-gray-900">Selected dataset</span>
                {parsedMeta && (
                  <span className="ml-2">
                    Coordinates: {parsedMeta.latitude}, {parsedMeta.longitude} &nbsp;·&nbsp; Date range:{" "}
                    {parsedMeta.startDate} to {parsedMeta.endDate} &nbsp;·&nbsp;
                  </span>
                )}
                <span className="break-all"> File: {selectedFile}</span>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-3 border-l-2 border-brand-500 pl-2 text-sm font-medium text-gray-900">
                  Temperature chart
                </div>
                {contentLoading && <LoadingState label="Loading temperature chart" rows={5} />}
                {!contentLoading && contentError && <ErrorMessage message={contentError} />}
                {!contentLoading && !contentError && <WeatherChart rows={rows} />}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-3 border-l-2 border-brand-500 pl-2 text-sm font-medium text-gray-900">
                  Detailed weather table
                </div>
                {contentLoading && <LoadingState label="Loading weather table" rows={5} />}
                {!contentLoading && contentError && <ErrorMessage message={contentError} />}
                {!contentLoading && !contentError && <WeatherTable rows={rows} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
