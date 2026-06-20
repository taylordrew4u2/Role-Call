"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, ExternalLink, Check, Loader2 } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ScriptEditor({
  projectId,
  isOwner,
  initialContent,
  initialFileUrl,
  initialFileName,
}: {
  projectId: number;
  isOwner: boolean;
  initialContent: string;
  initialFileUrl: string | null;
  initialFileName: string | null;
}) {
  const [content, setContent] = useState(initialContent);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [fileUrl, setFileUrl] = useState(initialFileUrl);
  const [fileName, setFileName] = useState(initialFileName);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save(next: string) {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/script`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setContent(next);
    setSaveState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(next), 1000);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/script/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
        return;
      }
      setFileUrl(data.url);
      setFileName(data.name);
    } catch {
      setUploadError("Network error during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Script</h2>
        </div>
        {isOwner && (
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            {saveState === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Saved
              </>
            )}
            {saveState === "error" && (
              <span className="text-red-600">Save failed</span>
            )}
          </span>
        )}
      </div>

      {/* Uploaded file */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-red-600 font-medium hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {fileName ?? "View uploaded script"}
              </a>
            ) : (
              <span className="text-slate-500">No script file uploaded.</span>
            )}
          </div>
          {isOwner && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.fountain,.fdx,.txt,.doc,.docx"
                onChange={handleUpload}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1.5" />
                )}
                {fileUrl ? "Replace file" : "Upload file"}
              </Button>
            </div>
          )}
        </div>
        {uploadError && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {uploadError}
          </p>
        )}
      </div>

      {/* Typed/pasted script */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Script text
        </label>
        <textarea
          value={content}
          onChange={handleChange}
          readOnly={!isOwner}
          placeholder={
            isOwner
              ? "Type or paste your screenplay here… it saves automatically."
              : "No script text yet."
          }
          className="w-full min-h-[60vh] rounded-md border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
