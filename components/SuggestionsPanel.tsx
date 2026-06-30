"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "@/components/Toaster";
import type { ScriptSuggestion } from "@/lib/db/schema";

export function SuggestionsPanel({
  projectId,
  isWriter,
  suggestions,
  onResolved,
}: {
  projectId: number;
  isWriter: boolean;
  suggestions: ScriptSuggestion[];
  onResolved: (suggestion: ScriptSuggestion, newContent: string | null) => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function resolve(s: ScriptSuggestion, action: "approve" | "decline") {
    setBusyId(s.id);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/script/suggestions/${s.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Couldn't update suggestion.");
        return;
      }
      onResolved(data.suggestion, data.script?.content ?? null);
      if (action === "approve" && s.anchorText && !data.script) {
        toast("Approved, but the original text was no longer found to replace.");
      } else {
        toast(action === "approve" ? "Suggestion approved." : "Suggestion declined.");
      }
    } catch {
      toast("Network error. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = suggestions.filter((s) => s.status === "pending");
  const resolved = suggestions.filter((s) => s.status !== "pending");

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50 text-sm font-semibold text-slate-700">
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        Suggested edits
        {pending.length > 0 && (
          <Badge className="ml-1">{pending.length} pending</Badge>
        )}
      </div>

      {suggestions.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-400">
          No suggestions yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {[...pending, ...resolved].map((s) => (
            <li key={s.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {s.authorName}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>

                  {s.anchorText && (
                    <p className="mt-1.5 text-xs font-mono text-red-700 bg-red-50 rounded px-2 py-1 line-through whitespace-pre-wrap break-words">
                      {s.anchorText}
                    </p>
                  )}
                  {s.suggestedText && (
                    <p className="mt-1 text-xs font-mono text-emerald-800 bg-emerald-50 rounded px-2 py-1 whitespace-pre-wrap break-words">
                      {s.suggestedText}
                    </p>
                  )}
                  {s.comment && (
                    <p className="mt-1.5 text-xs text-slate-600 italic">“{s.comment}”</p>
                  )}
                </div>

                {isWriter && s.status === "pending" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => resolve(s, "approve")}
                      disabled={busyId === s.id}
                      aria-label="Approve suggestion"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {busyId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      onClick={() => resolve(s, "decline")}
                      disabled={busyId === s.id}
                      aria-label="Decline suggestion"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">approved</Badge>;
  if (status === "declined")
    return <Badge variant="secondary">declined</Badge>;
  return (
    <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">
      pending
    </span>
  );
}
