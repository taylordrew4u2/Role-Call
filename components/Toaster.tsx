"use client";

import { useEffect, useState } from "react";

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error";
}

const EVENT = "rolecall-toast";

/** Fire a toast from anywhere on the client. */
export function toast(message: string, variant: "success" | "error" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, variant } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const { message, variant } = (e as CustomEvent).detail as {
        message: string;
        variant: "success" | "error";
      };
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, variant }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 3500);
    }
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 print:hidden">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={
            "rounded-lg px-4 py-2.5 text-sm shadow-lg border " +
            (t.variant === "error"
              ? "bg-red-600 text-white border-red-700"
              : "bg-slate-900 text-white border-slate-700")
          }
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
