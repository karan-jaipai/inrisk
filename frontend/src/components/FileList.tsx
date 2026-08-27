import { formatFileSize, formatRelativeTime } from "../utils/format";
import type { FileMetadata } from "../types/weather";

interface FileListProps {
  files: FileMetadata[];
  selectedFile: string | null;
  onSelect: (filename: string) => void;
  onDownload: (filename: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M4 4v5h5M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5.5 9a7 7 0 0 1 12.3-3M18.5 15a7 7 0 0 1-12.3 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M12 4v11m0 0-4-4m4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FileList({
  files,
  selectedFile,
  onSelect,
  onDownload,
  onRefresh,
  isLoading,
  error,
}: FileListProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="border-l-2 border-brand-500 pl-2 text-sm font-medium text-gray-900">
          Available files
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh file list"
          className="text-gray-400 transition hover:text-gray-600"
        >
          <RefreshIcon />
        </button>
      </div>

      {isLoading && (
        <ul className="space-y-2" aria-label="Loading stored files">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </ul>
      )}

      {!isLoading && error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && files.length === 0 && (
        <p className="text-sm text-gray-500">No stored weather files yet.</p>
      )}

      {!isLoading && !error && files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file) => {
            const isSelected = file.name === selectedFile;
            return (
              <li key={file.name}>
                <div
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    isSelected ? "border-brand-500" : "border-gray-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(file.name)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} · {formatRelativeTime(file.created_at)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(file.name)}
                    aria-label={`Download ${file.name}`}
                    className="ml-2 shrink-0 text-gray-400 transition hover:text-gray-600"
                  >
                    <DownloadIcon />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
