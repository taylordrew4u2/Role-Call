"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "rolecall-install-dismissed";
const DISMISS_DAYS = 14;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function recentlyDismissed(): boolean {
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    return !!at && Date.now() - Number(at) < DISMISS_DAYS * 86400000;
  } catch {
    return true;
  }
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already running as an installed app, or dismissed recently — stay quiet.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's non-standard flag
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone || recentlyDismissed()) return;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Android/Chrome path: the browser tells us the app is installable.
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS path: no install API — show Add to Home Screen instructions.
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIos) {
      iosTimer = setTimeout(() => {
        setShowIos(true);
        setVisible(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") setVisible(false);
    else dismiss();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 sm:bottom-3 z-50 rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:left-auto sm:right-4 sm:w-80 print:hidden">
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600">
          <Clapperboard className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            Add RoleCall to your home screen
          </p>
          {showIos ? (
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Share" />{" "}
              then{" "}
              <span className="whitespace-nowrap">
                <SquarePlus className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />{" "}
                &ldquo;Add to Home Screen&rdquo;
              </span>{" "}
              — works offline on set, syncs when you&apos;re back online.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-slate-500">
                Works offline on set and syncs when you&apos;re back online.
              </p>
              <Button size="sm" className="mt-2 h-8" onClick={install}>
                Install app
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
