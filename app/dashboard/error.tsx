"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center py-24 text-center px-4">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        Failed to load this page
      </h2>
      <p className="text-slate-500 text-sm mb-6 max-w-sm">
        A server error occurred. Check that your database is reachable and your
        environment variables are set, then try again.
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono mb-4">
          Code: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
