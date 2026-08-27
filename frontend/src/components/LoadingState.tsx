interface LoadingStateProps {
  label: string;
  rows?: number;
}

export default function LoadingState({ label, rows = 3 }: LoadingStateProps) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
