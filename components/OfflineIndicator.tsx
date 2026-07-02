"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw, Check } from "lucide-react";

type SyncState = "offline" | "pending" | "synced" | null;

export function OfflineIndicator() {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
      // Kick the service worker to replay any queued writes.
      navigator.serviceWorker?.controller?.postMessage({ type: "replay-queue" });
    }
    function handleOffline() {
      setOnline(false);
    }
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== "sync-status") return;
      setPending(e.data.pending ?? 0);
      if (e.data.synced > 0 && e.data.pending === 0) {
        setJustSynced(true);
        // Server state changed under us — re-render server components.
        router.refresh();
        setTimeout(() => setJustSynced(false), 4000);
      }
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleMessage);
    // Ask for the current queue size on mount (e.g. after a reload while offline).
    navigator.serviceWorker?.controller?.postMessage({ type: "queue-size" });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [router]);

  const state: SyncState = !online
    ? "offline"
    : pending > 0
      ? "pending"
      : justSynced
        ? "synced"
        : null;

  if (!state) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg print:hidden ${
        state === "offline"
          ? "bg-slate-800 text-white"
          : state === "pending"
            ? "bg-amber-500 text-white"
            : "bg-emerald-600 text-white"
      }`}
    >
      {state === "offline" && (
        <>
          <CloudOff className="h-4 w-4" />
          Offline
          {pending > 0 && ` — ${pending} change${pending !== 1 ? "s" : ""} will sync`}
        </>
      )}
      {state === "pending" && (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Syncing {pending} change{pending !== 1 ? "s" : ""}…
        </>
      )}
      {state === "synced" && (
        <>
          <Check className="h-4 w-4" />
          All changes synced
        </>
      )}
    </div>
  );
}
