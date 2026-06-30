"use client";

import { useState } from "react";
import { FileText, FileCheck2, PenLine, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/Toaster";
import { ScreenplayEditor } from "@/components/ScreenplayEditor";
import { SuggestEditModal } from "@/components/SuggestEditModal";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { ScriptHighlighter } from "@/components/ScriptHighlighter";
import type { ScriptSuggestion } from "@/lib/db/schema";

type Tab = "editing" | "final";

interface EligibleWriter {
  clerkUserId: string;
  displayName: string;
}

interface CastMember {
  displayName: string;
  character: string | null;
}

export function ScriptWorkspace({
  projectId,
  isOwner,
  isWriter,
  canViewEditing = true,
  ownerId,
  writerId,
  eligibleWriters,
  cast = [],
  initialContent,
  initialFinalContent,
  initialFileUrl,
  initialFileName,
  initialSuggestions,
}: {
  projectId: number;
  isOwner: boolean;
  isWriter: boolean;
  canViewEditing?: boolean;
  ownerId: string;
  writerId: string | null;
  eligibleWriters: EligibleWriter[];
  cast?: CastMember[];
  initialContent: string;
  initialFinalContent: string;
  initialFileUrl: string | null;
  initialFileName: string | null;
  initialSuggestions: ScriptSuggestion[];
}) {
  const [tab, setTab] = useState<Tab>("editing");
  const [content, setContent] = useState(initialContent);
  const [finalContent, setFinalContent] = useState(initialFinalContent);
  const [fileUrl, setFileUrl] = useState(initialFileUrl);
  const [fileName, setFileName] = useState(initialFileName);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [currentWriter, setCurrentWriter] = useState<string | null>(writerId);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestAnchor, setSuggestAnchor] = useState("");
  const [suggestSeq, setSuggestSeq] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [savingWriter, setSavingWriter] = useState(false);

  function openSuggest(selected: string) {
    setSuggestAnchor(selected);
    setSuggestSeq((n) => n + 1);
    setSuggestOpen(true);
  }

  async function publish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/script/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Couldn't publish.");
        return;
      }
      setFinalContent(data.finalContent ?? content);
      toast("Published to the Final Script.");
    } catch {
      toast("Network error. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  async function changeWriter(nextWriterId: string) {
    setSavingWriter(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/script/writer`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writerId: nextWriterId === "" ? null : nextWriterId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Couldn't update the writer.");
        return;
      }
      setCurrentWriter(nextWriterId);
      toast("Script writer updated.");
    } catch {
      toast("Network error. Please try again.");
    } finally {
      setSavingWriter(false);
    }
  }

  const writerName = currentWriter === null
    ? "unassigned"
    : eligibleWriters.find((w) => w.clerkUserId === currentWriter)?.displayName ??
      "the appointed writer";

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  // Non-editors (cast, plain crew) only see the final script with character highlighting.
  if (!canViewEditing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Script</h2>
        </div>
        <ScriptHighlighter
          content={finalContent || content}
          cast={cast}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Script</h2>
        </div>

        {/* Writer indicator / appointment */}
        <div className="flex items-center gap-2 text-sm">
          <Crown className="h-4 w-4 text-amber-500" />
          <span className="text-slate-500">Writer:</span>
          {isOwner ? (
            <select
              value={currentWriter ?? ""}
              onChange={(e) => changeWriter(e.target.value)}
              disabled={savingWriter}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50"
            >
              <option value="">None</option>
              {eligibleWriters.map((w) => (
                <option key={w.clerkUserId} value={w.clerkUserId}>
                  {w.displayName}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-medium text-slate-700">
              {isWriter ? "You" : writerName}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <TabButton
          active={tab === "editing"}
          onClick={() => setTab("editing")}
          icon={PenLine}
          label="Editing Script"
        />
        <TabButton
          active={tab === "final"}
          onClick={() => setTab("final")}
          icon={FileCheck2}
          label="Final Script"
        />
      </div>

      {tab === "editing" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <ScreenplayEditor
            projectId={projectId}
            canEdit={isWriter}
            content={content}
            onContentChange={setContent}
            onSuggest={openSuggest}
            fileUrl={fileUrl}
            fileName={fileName}
            onFileChange={(url, name) => {
              setFileUrl(url);
              setFileName(name);
            }}
          />
          <div className="space-y-3">
            {isWriter && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                You're the script writer. Edits save automatically. Use
                <span className="font-medium"> Publish to Final </span>
                when you're ready to lock a version.
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={publish}
                  disabled={publishing}
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <FileCheck2 className="h-4 w-4 mr-1.5" />
                  )}
                  Publish to Final
                </Button>
              </div>
            )}
            <SuggestionsPanel
              projectId={projectId}
              isWriter={isWriter}
              suggestions={suggestions}
              onResolved={(updated, newContent) => {
                setSuggestions((prev) =>
                  prev.map((s) => (s.id === updated.id ? updated : s))
                );
                if (newContent !== null) setContent(newContent);
              }}
            />
          </div>
        </div>
      ) : (
        <FinalScript
          finalContent={finalContent}
          cast={cast}
          isWriter={isWriter}
          publishing={publishing}
          onPublish={publish}
        />
      )}

      <SuggestEditModal
        key={suggestSeq}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        projectId={projectId}
        initialAnchor={suggestAnchor}
        onCreated={(s) => {
          setSuggestions((prev) => [s, ...prev]);
          toast("Suggestion sent to the writer.");
        }}
      />

      {tab === "editing" && !isWriter && pendingCount > 0 && (
        <p className="text-xs text-slate-400">
          {pendingCount} suggestion{pendingCount !== 1 ? "s" : ""} awaiting the writer's review.
        </p>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof PenLine;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-red-600 text-red-600"
          : "border-transparent text-slate-500 hover:text-slate-900"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FinalScript({
  finalContent,
  cast,
  isWriter,
  publishing,
  onPublish,
}: {
  finalContent: string;
  cast: CastMember[];
  isWriter: boolean;
  publishing: boolean;
  onPublish: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          The approved, finished version of the script.
        </p>
        {isWriter && (
          <Button size="sm" onClick={onPublish} disabled={publishing}>
            {publishing ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileCheck2 className="h-4 w-4 mr-1.5" />
            )}
            Publish current draft
          </Button>
        )}
      </div>
      {finalContent.trim() ? (
        <ScriptHighlighter content={finalContent} cast={cast} />
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FileCheck2 className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="mt-2 text-sm text-slate-500">Nothing published yet.</p>
          {isWriter && (
            <p className="mt-1 text-xs text-slate-400">
              Use "Publish current draft" to lock the editing draft as the final script.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
