"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
          <p className="text-slate-500 text-sm">
            A server error occurred. This is usually caused by a missing
            environment variable (Clerk keys, Postgres URL) or a database
            connection issue.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono">
              Error code: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
