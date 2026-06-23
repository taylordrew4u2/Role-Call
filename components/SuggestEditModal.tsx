"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus } from "lucide-react";
import type { ScriptSuggestion } from "@/lib/db/schema";

export function SuggestEditModal({
  open,
  onOpenChange,
  projectId,
  initialAnchor,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  initialAnchor: string;
  onCreated: (s: ScriptSuggestion) => void;
}) {
  // The parent remounts this modal (via a changing key) each time it opens, so
  // initializing from props here is enough to seed a fresh form per selection.
  const [anchor, setAnchor] = useState(initialAnchor);
  const [suggested, setSuggested] = useState(initialAnchor);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!suggested.trim() && !comment.trim()) {
      setError("Add a suggested replacement or a comment.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/script/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchorText: anchor, suggestedText: suggested, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't submit suggestion.");
        return;
      }
      onCreated(data);
      onOpenChange(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Suggest an edit
          </DialogTitle>
          <DialogDescription>
            Propose a change to the script. The appointed writer will approve or
            decline it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="sg-anchor">Original text</Label>
            <textarea
              id="sg-anchor"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              placeholder="The exact text you want changed (leave blank for a general note)."
              className="w-full min-h-[72px] rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sg-suggested">Suggested replacement</Label>
            <textarea
              id="sg-suggested"
              value={suggested}
              onChange={(e) => setSuggested(e.target.value)}
              placeholder="What it should say instead."
              className="w-full min-h-[72px] rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sg-comment">
              Comment <span className="text-slate-400">(optional)</span>
            </Label>
            <textarea
              id="sg-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why this change?"
              className="w-full min-h-[56px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}
          {anchor.trim() && (
            <p className="text-xs text-slate-500">
              On approval, the first match of the original text in the editing draft
              is replaced with your suggestion.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? "Submitting…" : "Submit suggestion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
