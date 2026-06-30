"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  ExternalLink,
  Check,
  Loader2,
  Clapperboard,
  AlignLeft,
  User,
  Parentheses,
  MessageSquare,
  ArrowRightLeft,
  Plus,
  MessageSquarePlus,
  List,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  applyElement,
  insertSceneTemplate,
  ELEMENT_LABELS,
  type ScreenplayElement,
} from "@/lib/screenplay-format";

type SaveState = "idle" | "saving" | "saved" | "error";

const TOOLBAR: { element: ScreenplayElement; icon: typeof User }[] = [
  { element: "scene", icon: Clapperboard },
  { element: "action", icon: AlignLeft },
  { element: "character", icon: User },
  { element: "parenthetical", icon: Parentheses },
  { element: "dialogue", icon: MessageSquare },
  { element: "transition", icon: ArrowRightLeft },
];

const SCENE_HEADING_RE =
  /^\s*(?:[0-9]+[A-Za-z]?[.)]?\s*)?(?:INT|EXT|EST|INT\.?\/EXT|EXT\.?\/INT|I\/E)\.?[\s.]/i;

function parseScenes(content: string): { number: number; heading: string; charOffset: number }[] {
  const scenes: { number: number; heading: string; charOffset: number }[] = [];
  const lines = content.split("\n");
  let offset = 0;
  let sceneNum = 1;
  for (const line of lines) {
    if (SCENE_HEADING_RE.test(line)) {
      scenes.push({ number: sceneNum++, heading: line.trim(), charOffset: offset });
    }
    offset += line.length + 1;
  }
  return scenes;
}

function estimatePages(content: string): number {
  const lines = content.split("\n").filter((l) => l.trim()).length;
  return Math.max(1, Math.round(lines / 55));
}

export function ScreenplayEditor({
  projectId,
  canEdit,
  content,
  onContentChange,
  onSuggest,
  fileUrl,
  fileName,
  onFileChange,
}: {
  projectId: number;
  canEdit: boolean;
  content: string;
  onContentChange: (next: string) => void;
  onSuggest: (selectedText: string) => void;
  fileUrl: string | null;
  fileName: string | null;
  onFileChange: (url: string | null, name: string | null) => void;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const scenes = useMemo(() => parseScenes(content), [content]);
  const pageCount = useMemo(() => estimatePages(content), [content]);

  async function save(next: string) {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/script`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
        signal: abortRef.current.signal,
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setSaveState("error");
    }
  }

  function pushChange(next: string) {
    onContentChange(next);
    setSaveState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(next), 1000);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    pushChange(e.target.value);
  }

  function applyFormat(element: ScreenplayElement) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { text, selStart, selEnd } = applyElement(
      content,
      ta.selectionStart,
      ta.selectionEnd,
      element
    );
    pushChange(text);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  }

  function addScene() {
    const ta = textareaRef.current;
    if (!ta) return;
    const { text, selStart, selEnd } = insertSceneTemplate(content, ta.selectionStart);
    pushChange(text);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  }

  function suggestSelection() {
    const ta = textareaRef.current;
    if (!ta) return;
    const selected = content.slice(ta.selectionStart, ta.selectionEnd);
    onSuggest(selected);
  }

  function jumpToScene(charOffset: number) {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(charOffset, charOffset);
    // Scroll to the correct line using line-height, not a length ratio
    const linesBefore = content.slice(0, charOffset).split("\n").length - 1;
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
    ta.scrollTop = Math.max(0, linesBefore * lineHeight - ta.clientHeight / 3);
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
      onFileChange(data.url, data.name);
    } catch {
      setUploadError("Network error during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {/* Uploaded file row */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
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
          {canEdit && (
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

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {canEdit ? (
            <>
              <button
                onClick={addScene}
                title="Insert a new scene heading"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> New Scene
              </button>
              <span className="mx-1 h-5 w-px bg-slate-200" />
              {TOOLBAR.map(({ element, icon: Icon }) => (
                <button
                  key={element}
                  onClick={() => applyFormat(element)}
                  title={`Format line as ${ELEMENT_LABELS[element]}`}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{ELEMENT_LABELS[element]}</span>
                </button>
              ))}
            </>
          ) : (
            <button
              onClick={suggestSelection}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Suggest an edit
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Page / scene count */}
          <span className="text-xs text-slate-400">
            ~{pageCount}p · {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
          </span>

          {/* Save state */}
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            {canEdit && saveState === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            )}
            {canEdit && saveState === "saved" && (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Saved
              </>
            )}
            {canEdit && saveState === "error" && (
              <span className="text-red-600">Save failed</span>
            )}
          </span>
        </div>
      </div>

      {/* Scene navigator */}
      {scenes.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <button
            onClick={() => setNavOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <List className="h-3.5 w-3.5" />
              Scene Navigator ({scenes.length})
            </span>
            {navOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
          {navOpen && (
            <div className="border-t border-slate-100 max-h-48 overflow-y-auto divide-y divide-slate-50">
              {scenes.map((scene) => (
                <button
                  key={scene.charOffset}
                  onClick={() => jumpToScene(scene.charOffset)}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors"
                >
                  <span className="shrink-0 text-slate-400 font-mono w-5 text-right">{scene.number}</span>
                  <span className="text-slate-700 truncate">{scene.heading}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Screenplay page */}
      <div className="rounded-lg bg-slate-300 py-6 px-4 min-h-[70vh]">
        <div className="bg-white shadow-md mx-auto max-w-[680px] min-h-[64vh]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            readOnly={!canEdit}
            aria-readonly={!canEdit}
            placeholder={
              canEdit
                ? 'FADE IN:\n\nINT. LOCATION - DAY\n\nAction description here...\n\n                    CHARACTER NAME\n          Dialogue goes here.'
                : 'No script text yet. Select any passage above and click "Suggest an edit."'
            }
            className="w-full min-h-[64vh] bg-transparent border-0 outline-none resize-none text-slate-900 placeholder:text-slate-300"
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "12pt",
              lineHeight: "1.7",
              padding: "72px 64px",
            }}
          />
        </div>
      </div>

      {!canEdit && (
        <p className="text-xs text-slate-500">
          You can&apos;t edit the script directly. Select the text you want changed and
          click <span className="font-medium">&ldquo;Suggest an edit&rdquo;</span> — the writer
          will review it.
        </p>
      )}
    </div>
  );
}
