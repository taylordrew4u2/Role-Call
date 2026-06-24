"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Clapperboard,
  Film,
  List,
  Table2,
  LayoutGrid,
  ClipboardPaste,
  Download,
  Copy,
  Printer,
  Wand2,
  CheckSquare,
  Square,
  Users,
  Video,
} from "lucide-react";
import type { Scene, Shot } from "@/lib/db/schema";
import { parseShotLines } from "@/lib/parse-shots";
import { suggestShotFields } from "@/lib/suggest-shot";
import { toast } from "@/components/Toaster";

type ViewMode = "scene" | "actor" | "table" | "cards";

type Selection = {
  mode: boolean;
  selected: Set<number>;
  toggle: (id: number) => void;
};

// A checkbox cell shown in select mode.
function SelectBox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="text-slate-500 hover:text-slate-900"
      aria-label={checked ? "Deselect shot" : "Select shot"}
    >
      {checked ? (
        <CheckSquare className="h-4 w-4 text-slate-900" />
      ) : (
        <Square className="h-4 w-4" />
      )}
    </button>
  );
}

const SHOT_SIZES = ["", "EWS", "WS", "MWS", "MS", "MCU", "CU", "ECU", "OTS", "POV", "Insert"];
const ANGLES = ["", "Eye-level", "High", "Low", "Dutch", "Overhead", "Worm's-eye"];
const MOVEMENTS = ["", "Static", "Pan", "Tilt", "Dolly", "Track", "Handheld", "Steadicam", "Gimbal", "Crane", "Zoom"];
const STATUSES = ["planned", "shot", "omitted"];
const INT_EXT = ["", "INT", "EXT", "INT/EXT"];
const TIMES = ["", "DAY", "NIGHT", "DAWN", "DUSK", "CONTINUOUS"];

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50";

function statusBadge(status: string) {
  if (status === "shot") return <Badge className="bg-emerald-600">Shot</Badge>;
  if (status === "omitted") return <Badge variant="secondary">Omitted</Badge>;
  return <Badge variant="outline">Planned</Badge>;
}

const NO_CAST = "Unassigned";

interface CastRef {
  character: string | null;
  displayName: string;
}

interface CastGroup {
  key: string;
  /** Primary label — the actor's name when known, otherwise the cast note. */
  label: string;
  /** Secondary line, e.g. "as DETECTIVE MARA", or null. */
  sub: string | null;
  shots: Shot[];
  sceneCount: number;
}

// Split a free-text cast note ("John, Mary & extras") into individual names so
// a shot can appear under every actor it features.
function castNames(castNotes: string | null): string[] {
  if (!castNotes) return [];
  return castNotes
    .split(/,|&|\band\b|\/|\+/i)
    .map((n) => n.trim())
    .filter(Boolean);
}

// Resolve a raw cast note to a canonical group: prefer matching a real cast
// member (by character or actor name, case-insensitively) so coverage tagged
// with a character ("MARA") collapses under the actor playing them, shown as
// "Alex Rivera — as MARA".
function resolveCast(
  raw: string,
  byChar: Map<string, CastRef>,
  byName: Map<string, CastRef>
): { key: string; label: string; sub: string | null } {
  if (raw === NO_CAST) return { key: NO_CAST, label: NO_CAST, sub: null };
  const norm = raw.trim().toLowerCase();
  const member = byChar.get(norm) ?? byName.get(norm);
  if (member && member.displayName.trim()) {
    const character = member.character?.trim();
    return {
      key: "actor:" + member.displayName.trim().toLowerCase(),
      label: member.displayName.trim(),
      sub: character ? `as ${character}` : null,
    };
  }
  // No actor yet (or an unknown name): group case-insensitively by the note.
  return { key: "name:" + norm, label: raw.trim(), sub: null };
}

const TOGETHER = "Characters together";

// Group shots by cast. A shot featuring a single character goes under that
// character; a shot with two or more goes into one "Characters together"
// section (instead of being duplicated under each). No-cast shots fall under
// "Unassigned". Individual characters are ordered by workload (busiest first),
// with "Characters together" then "Unassigned" last.
function groupShotsByCast(shots: Shot[], cast: CastRef[]): CastGroup[] {
  const byChar = new Map<string, CastRef>();
  const byName = new Map<string, CastRef>();
  for (const m of cast) {
    if (m.character?.trim()) byChar.set(m.character.trim().toLowerCase(), m);
    if (m.displayName.trim()) byName.set(m.displayName.trim().toLowerCase(), m);
  }

  const groups = new Map<
    string,
    { label: string; sub: string | null; shots: Shot[]; scenes: Set<number | null> }
  >();
  const add = (key: string, label: string, sub: string | null, shot: Shot) => {
    let g = groups.get(key);
    if (!g) {
      g = { label, sub, shots: [], scenes: new Set() };
      groups.set(key, g);
    }
    g.shots.push(shot);
    g.scenes.add(shot.sceneId);
  };

  for (const shot of shots) {
    const names = castNames(shot.castNotes);
    if (names.length === 0) {
      add(NO_CAST, NO_CAST, null, shot);
      continue;
    }
    // Resolve and de-dupe the shot's distinct cast.
    const resolved = new Map<string, { label: string; sub: string | null }>();
    for (const raw of names) {
      const r = resolveCast(raw, byChar, byName);
      if (!resolved.has(r.key)) resolved.set(r.key, { label: r.label, sub: r.sub });
    }
    if (resolved.size === 1) {
      const [[, only]] = [...resolved.entries()];
      add("solo:" + only.label.toLowerCase(), only.label, only.sub, shot);
    } else {
      add(TOGETHER, TOGETHER, [...resolved.values()].map((r) => r.label).join(", "), shot);
    }
  }

  return [...groups.values()]
    .map((g) => ({
      key: g.label + (g.sub ?? ""),
      label: g.label,
      sub: g.label === TOGETHER ? null : g.sub,
      shots: g.shots,
      sceneCount: g.scenes.size,
    }))
    .sort((a, b) => {
      // Order: individual characters (busiest first), then Together, then Unassigned.
      const rank = (l: string) => (l === NO_CAST ? 2 : l === TOGETHER ? 1 : 0);
      const ra = rank(a.label);
      const rb = rank(b.label);
      if (ra !== rb) return ra - rb;
      return b.shots.length - a.shots.length || a.label.localeCompare(b.label);
    });
}

export function ShotListBoard({
  projectId,
  canEdit,
  initialScenes,
  initialShots,
  cast = [],
  initialCameraSetup = "single",
}: {
  projectId: number;
  canEdit: boolean;
  initialScenes: Scene[];
  initialShots: Shot[];
  cast?: CastRef[];
  initialCameraSetup?: string;
}) {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [shots, setShots] = useState<Shot[]>(initialShots);
  const [cameraSetup, setCameraSetup] = useState(
    initialCameraSetup === "dual" ? "dual" : "single"
  );

  const [sceneDialog, setSceneDialog] = useState<{ open: boolean; scene: Scene | null }>({
    open: false,
    scene: null,
  });
  const [shotDialog, setShotDialog] = useState<{
    open: boolean;
    shot: Shot | null;
    sceneId: number | null;
  }>({ open: false, shot: null, sceneId: null });
  const [viewMode, setViewMode] = useState<ViewMode>("scene");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // ---- Mass selection ----
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const api = `/api/projects/${projectId}`;

  // ---- Camera setup ("filming on") ----
  async function changeCameraSetup(next: string) {
    const prev = cameraSetup;
    setCameraSetup(next); // optimistic
    try {
      const res = await fetch(api, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cameraSetup: next }),
      });
      if (!res.ok) {
        setCameraSetup(prev);
        toast("Couldn't save the camera setup.", "error");
      }
    } catch {
      setCameraSetup(prev);
      toast("Network error. Please try again.", "error");
    }
  }

  // ---- Build scenes + shots from the saved script (local parsing, no cost) ----
  async function generateScenesFromScript(mode: "action" | "dialogue" | "both") {
    setGenerating(true);
    try {
      const res = await fetch(`${api}/scenes/from-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, cameraSetup }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Couldn't read the script.", "error");
        return;
      }
      setScenes((s) => [...s, ...(data.scenes ?? [])]);
      setShots((s) => [...s, ...(data.shots ?? [])]);
      const sceneCount = data.scenes?.length ?? 0;
      const shotCount = data.shots?.length ?? 0;
      toast(
        `Added ${sceneCount} scene${sceneCount === 1 ? "" : "s"} and ${shotCount} shot${shotCount === 1 ? "" : "s"} from the script.`
      );
      setGenerateOpen(false);
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setGenerating(false);
    }
  }

  const sceneName = (sceneId: number | null) => {
    if (sceneId === null) return "";
    const s = scenes.find((x) => x.id === sceneId);
    return s ? `${s.sceneNumber ? s.sceneNumber + " " : ""}${s.heading}` : "";
  };

  // ---- Bulk add from text ----
  async function bulkAdd(text: string, sceneId: number | null) {
    const parsed = parseShotLines(text);
    if (parsed.length === 0) return;
    const res = await fetch(`${api}/shots/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shots: parsed, sceneId }),
    });
    if (res.ok) {
      const created: Shot[] = await res.json();
      setShots((s) => [...s, ...created]);
      setBulkOpen(false);
    }
  }

  // ---- Export ----
  function exportRows() {
    return shots.map((s) => ({
      Scene: sceneName(s.sceneId),
      Shot: s.shotNumber,
      Size: s.shotSize ?? "",
      Angle: s.angle ?? "",
      Movement: s.movement ?? "",
      Character: s.castNotes ?? "",
      Description: s.description,
      Status: s.status,
    }));
  }

  function downloadCsv() {
    const rows = exportRows();
    const headers = Object.keys(rows[0] ?? { Shot: "" });
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escape((r as Record<string, string>)[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shot-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyText() {
    const text = exportRows()
      .map(
        (r) =>
          `${r.Scene ? r.Scene + " — " : ""}${r.Shot}. ${[r.Size, r.Angle, r.Movement, r.Character]
            .filter(Boolean)
            .join(", ")}${r.Description ? " — " + r.Description : ""}`
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("Shot list copied to clipboard.");
    } catch {
      toast("Couldn't copy — your browser blocked it.", "error");
    }
  }

  // ---- Scene actions ----
  async function saveScene(data: Partial<Scene>, existing: Scene | null) {
    if (existing) {
      const res = await fetch(`${api}/scenes/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setScenes((s) => s.map((x) => (x.id === updated.id ? updated : x)));
      }
    } else {
      const res = await fetch(`${api}/scenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setScenes((s) => [...s, created]);
      }
    }
    setSceneDialog({ open: false, scene: null });
  }

  async function deleteScene(scene: Scene) {
    if (!confirm(`Delete scene "${scene.heading}"? Its shots will be kept but unlinked.`)) return;
    const res = await fetch(`${api}/scenes/${scene.id}`, { method: "DELETE" });
    if (res.ok) {
      setScenes((s) => s.filter((x) => x.id !== scene.id));
      setShots((sh) => sh.map((x) => (x.sceneId === scene.id ? { ...x, sceneId: null } : x)));
    }
  }

  // ---- Shot actions ----
  async function saveShot(data: Partial<Shot>, existing: Shot | null) {
    if (existing) {
      const res = await fetch(`${api}/shots/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setShots((s) => s.map((x) => (x.id === updated.id ? updated : x)));
      }
    } else {
      const res = await fetch(`${api}/shots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setShots((s) => [...s, created]);
      }
    }
    setShotDialog({ open: false, shot: null, sceneId: null });
  }

  // ---- Backfill the Character field on existing shots from the script/cast ----
  async function backfillCharacters() {
    setBackfilling(true);
    try {
      const res = await fetch(`${api}/shots/backfill-characters`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Couldn't fill characters.", "error");
        return;
      }
      if (Array.isArray(data.shots)) setShots(data.shots);
      toast(
        data.updated > 0
          ? `Filled the character on ${data.updated} shot${data.updated === 1 ? "" : "s"}.`
          : "No blank shots could be matched — add characters by editing a shot."
      );
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setBackfilling(false);
    }
  }

  async function deleteShot(shot: Shot) {
    if (!confirm("Delete this shot?")) return;
    const res = await fetch(`${api}/shots/${shot.id}`, { method: "DELETE" });
    if (res.ok) setShots((s) => s.filter((x) => x.id !== shot.id));
  }

  // ---- Mass delete ----
  async function deleteSelectedShots() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected shot${ids.length === 1 ? "" : "s"}?`)) return;
    const res = await fetch(`${api}/shots/bulk`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      const removed = new Set(ids);
      setShots((s) => s.filter((x) => !removed.has(x.id)));
      setSelected(new Set());
      setSelectMode(false);
      toast(`Deleted ${ids.length} shot${ids.length === 1 ? "" : "s"}.`);
    } else {
      toast("Couldn't delete the selected shots.", "error");
    }
  }

  async function clearAllShots() {
    if (shots.length === 0) return;
    if (!confirm(`Delete all ${shots.length} shots? This can't be undone.`)) return;
    const res = await fetch(`${api}/shots/bulk`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (res.ok) {
      setShots([]);
      setSelected(new Set());
      setSelectMode(false);
      toast("All shots deleted.");
    } else {
      toast("Couldn't delete the shots.", "error");
    }
  }

  const selection = { mode: selectMode, selected, toggle: toggleSelected };

  const unlinkedShots = shots.filter((s) => s.sceneId === null);

  const hasShots = shots.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-slate-400 print:hidden" />
          <h2 className="text-lg font-semibold text-slate-900">Scenes &amp; Shot List</h2>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <Video className="h-4 w-4 text-slate-400" />
              <span className="hidden sm:inline">Filming on</span>
              <select
                className={selectClass + " w-auto"}
                value={cameraSetup}
                onChange={(e) => changeCameraSetup(e.target.value)}
                title="What you're filming on. One camera shoots one person per shot; two cameras can hold characters together."
              >
                <option value="single">iPhone / 1 camera</option>
                <option value="dual">2 cameras</option>
              </select>
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateOpen(true)}
              disabled={generating}
              className="gap-1.5"
            >
              <Wand2 className="h-4 w-4" />
              {generating ? "Reading script…" : "Scenes & shots from script"}
            </Button>
            {shots.some((s) => !s.castNotes?.trim()) && (
              <Button
                variant="outline"
                size="sm"
                onClick={backfillCharacters}
                disabled={backfilling}
                className="gap-1.5"
                title="Fill the Character field on existing shots from the script and cast"
              >
                <Users className="h-4 w-4" />
                {backfilling ? "Matching…" : "Fill characters"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="gap-1.5"
            >
              <ClipboardPaste className="h-4 w-4" /> Paste shots
            </Button>
            {hasShots && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectMode((m) => !m);
                  setSelected(new Set());
                }}
                className="gap-1.5"
              >
                <CheckSquare className="h-4 w-4" />
                {selectMode ? "Done selecting" : "Select"}
              </Button>
            )}
            <Button size="sm" onClick={() => setSceneDialog({ open: true, scene: null })}>
              <Plus className="h-4 w-4 mr-1" /> Add Scene
            </Button>
          </div>
        )}
      </div>

      {/* Mass-selection action bar */}
      {canEdit && selectMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm print:hidden">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700">
              {selected.size} selected
            </span>
            <button
              onClick={() => setSelected(new Set(shots.map((s) => s.id)))}
              className="text-slate-600 hover:text-slate-900 hover:underline"
            >
              Select all ({shots.length})
            </button>
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                className="text-slate-600 hover:text-slate-900 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelectedShots}
              disabled={selected.size === 0}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
              Delete {selected.size > 0 ? selected.size : ""} selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllShots}
              className="gap-1.5 text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete all
            </Button>
          </div>
        </div>
      )}

      {/* View switcher + export */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(
            [
              { id: "scene", label: "By Scene", icon: List },
              { id: "actor", label: "By Cast", icon: Users },
              { id: "table", label: "Table", icon: Table2 },
              { id: "cards", label: "Cards", icon: LayoutGrid },
            ] as { id: ViewMode; label: string; icon: typeof List }[]
          ).map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors " +
                  (viewMode === v.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>

        {hasShots && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyText} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        )}
      </div>

      {scenes.length === 0 && unlinkedShots.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Film className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            No shots yet.{" "}
            {canEdit
              ? "Add a scene, or use “Paste shots” to enter a list of shots as text."
              : ""}
          </p>
        </div>
      )}

      {/* By Scene view */}
      {viewMode === "scene" && (
        <>
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              shots={shots.filter((s) => s.sceneId === scene.id)}
              canEdit={canEdit}
              selection={selection}
              onEditScene={() => setSceneDialog({ open: true, scene })}
              onDeleteScene={() => deleteScene(scene)}
              onAddShot={() => setShotDialog({ open: true, shot: null, sceneId: scene.id })}
              onEditShot={(shot) => setShotDialog({ open: true, shot, sceneId: scene.id })}
              onDeleteShot={deleteShot}
            />
          ))}

          {unlinkedShots.length > 0 && (
            <SceneCard
              scene={null}
              shots={unlinkedShots}
              canEdit={canEdit}
              selection={selection}
              onEditScene={() => {}}
              onDeleteScene={() => {}}
              onAddShot={() => setShotDialog({ open: true, shot: null, sceneId: null })}
              onEditShot={(shot) => setShotDialog({ open: true, shot, sceneId: null })}
              onDeleteShot={deleteShot}
            />
          )}

          {canEdit && scenes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShotDialog({ open: true, shot: null, sceneId: null })}
            >
              <Plus className="h-4 w-4 mr-1" /> Add shot (no scene)
            </Button>
          )}
        </>
      )}

      {/* By Cast view — shots grouped by actor / character */}
      {viewMode === "actor" && hasShots && (
        <div className="space-y-6">
          {groupShotsByCast(shots, cast).map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-baseline gap-2 px-1">
                <Users className="h-4 w-4 text-slate-400 self-center" />
                <h3 className="font-semibold text-slate-900">
                  {group.label === NO_CAST ? "Unassigned (no cast)" : group.label}
                </h3>
                {group.sub && (
                  <span className="text-xs text-slate-400 italic">{group.sub}</span>
                )}
                <span className="text-xs text-slate-400">
                  {group.shots.length} shot{group.shots.length === 1 ? "" : "s"}
                  {group.sceneCount > 0 &&
                    ` · ${group.sceneCount} scene${group.sceneCount === 1 ? "" : "s"}`}
                </span>
              </div>
              <FlatShotTable
                shots={group.shots}
                sceneName={sceneName}
                canEdit={canEdit}
                selection={selection}
                onEditShot={(shot) =>
                  setShotDialog({ open: true, shot, sceneId: shot.sceneId })
                }
                onDeleteShot={deleteShot}
              />
            </div>
          ))}
        </div>
      )}

      {/* Flat table view */}
      {viewMode === "table" && hasShots && (
        <FlatShotTable
          shots={shots}
          sceneName={sceneName}
          canEdit={canEdit}
          selection={selection}
          onEditShot={(shot) =>
            setShotDialog({ open: true, shot, sceneId: shot.sceneId })
          }
          onDeleteShot={deleteShot}
        />
      )}

      {/* Cards view */}
      {viewMode === "cards" && hasShots && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              sceneName={sceneName(shot.sceneId)}
              canEdit={canEdit}
              selection={selection}
              onEdit={() => setShotDialog({ open: true, shot, sceneId: shot.sceneId })}
              onDelete={() => deleteShot(shot)}
            />
          ))}
        </div>
      )}

      {bulkOpen && (
        <BulkAddDialog
          scenes={scenes}
          onClose={() => setBulkOpen(false)}
          onAdd={bulkAdd}
        />
      )}

      {generateOpen && (
        <GenerateFromScriptDialog
          busy={generating}
          onClose={() => setGenerateOpen(false)}
          onGenerate={generateScenesFromScript}
        />
      )}

      {sceneDialog.open && (
        <SceneDialog
          scene={sceneDialog.scene}
          onClose={() => setSceneDialog({ open: false, scene: null })}
          onSave={saveScene}
        />
      )}
      {shotDialog.open && (
        <ShotDialog
          shot={shotDialog.shot}
          sceneId={shotDialog.sceneId}
          onClose={() => setShotDialog({ open: false, shot: null, sceneId: null })}
          onSave={saveShot}
        />
      )}
    </div>
  );
}

function SceneCard({
  scene,
  shots,
  canEdit,
  selection,
  onEditScene,
  onDeleteScene,
  onAddShot,
  onEditShot,
  onDeleteShot,
}: {
  scene: Scene | null;
  shots: Shot[];
  canEdit: boolean;
  selection: Selection;
  onEditScene: () => void;
  onDeleteScene: () => void;
  onAddShot: () => void;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shot: Shot) => void;
}) {
  const meta = scene
    ? [scene.intExt, scene.location, scene.timeOfDay].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">
            {scene ? (
              <>
                {scene.sceneNumber && (
                  <span className="text-red-600 mr-2">{scene.sceneNumber}</span>
                )}
                {scene.heading}
              </>
            ) : (
              "Unassigned shots"
            )}
          </h3>
          {meta && <p className="text-xs text-slate-500 mt-0.5">{meta}</p>}
          {scene?.synopsis && (
            <p className="text-sm text-slate-500 mt-1">{scene.synopsis}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={onAddShot}>
              <Plus className="h-4 w-4" />
            </Button>
            {scene && (
              <>
                <Button size="sm" variant="ghost" onClick={onEditScene}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDeleteScene}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {shots.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-400">No shots yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {canEdit && selection.mode && <TableHead className="w-10" />}
                <TableHead className="w-14">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-16">Size</TableHead>
                <TableHead className="w-24">Angle</TableHead>
                <TableHead className="w-24">Move</TableHead>
                <TableHead className="w-28">Character</TableHead>
                <TableHead className="w-24">Status</TableHead>
                {canEdit && !selection.mode && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shots.map((shot) => (
                <TableRow
                  key={shot.id}
                  className={
                    selection.mode && selection.selected.has(shot.id)
                      ? "bg-slate-50"
                      : undefined
                  }
                >
                  {canEdit && selection.mode && (
                    <TableCell>
                      <SelectBox
                        checked={selection.selected.has(shot.id)}
                        onChange={() => selection.toggle(shot.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{shot.shotNumber || "—"}</TableCell>
                  <TableCell className="max-w-xs">
                    {shot.description || <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell>{shot.shotSize || "—"}</TableCell>
                  <TableCell>{shot.angle || "—"}</TableCell>
                  <TableCell>{shot.movement || "—"}</TableCell>
                  <TableCell
                    className={shot.castNotes?.trim() ? "" : "text-amber-600"}
                  >
                    {shot.castNotes?.trim() || "Add"}
                  </TableCell>
                  <TableCell>{statusBadge(shot.status)}</TableCell>
                  {canEdit && !selection.mode && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onEditShot(shot)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDeleteShot(shot)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function SceneDialog({
  scene,
  onClose,
  onSave,
}: {
  scene: Scene | null;
  onClose: () => void;
  onSave: (data: Partial<Scene>, existing: Scene | null) => Promise<void>;
}) {
  const [sceneNumber, setSceneNumber] = useState(scene?.sceneNumber ?? "");
  const [heading, setHeading] = useState(scene?.heading ?? "");
  const [intExt, setIntExt] = useState(scene?.intExt ?? "");
  const [location, setLocation] = useState(scene?.location ?? "");
  const [timeOfDay, setTimeOfDay] = useState(scene?.timeOfDay ?? "");
  const [synopsis, setSynopsis] = useState(scene?.synopsis ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!heading.trim()) return;
    setSaving(true);
    await onSave(
      { sceneNumber, heading, intExt, location, timeOfDay, synopsis },
      scene
    );
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{scene ? "Edit Scene" : "Add Scene"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Scene #</Label>
              <Input value={sceneNumber} onChange={(e) => setSceneNumber(e.target.value)} placeholder="1A" />
            </div>
            <div className="space-y-1.5">
              <Label>INT / EXT</Label>
              <select className={selectClass} value={intExt} onChange={(e) => setIntExt(e.target.value)}>
                {INT_EXT.map((o) => (
                  <option key={o} value={o}>{o || "—"}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Heading *</Label>
            <Input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="INT. KITCHEN — DAY" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Kitchen" />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <select className={selectClass} value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}>
                {TIMES.map((o) => (
                  <option key={o} value={o}>{o || "—"}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Synopsis</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="What happens in this scene…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !heading.trim()}>
            {saving ? "Saving…" : "Save Scene"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShotDialog({
  shot,
  sceneId,
  onClose,
  onSave,
}: {
  shot: Shot | null;
  sceneId: number | null;
  onClose: () => void;
  onSave: (data: Partial<Shot>, existing: Shot | null) => Promise<void>;
}) {
  const [shotNumber, setShotNumber] = useState(shot?.shotNumber ?? "");
  const [description, setDescription] = useState(shot?.description ?? "");
  const [shotSize, setShotSize] = useState(shot?.shotSize ?? "");
  const [angle, setAngle] = useState(shot?.angle ?? "");
  const [movement, setMovement] = useState(shot?.movement ?? "");
  // Lens is preserved but no longer edited — the slot now holds Character.
  const [lens] = useState(shot?.lens ?? "");
  const [equipment, setEquipment] = useState(shot?.equipment ?? "");
  const [castNotes, setCastNotes] = useState(shot?.castNotes ?? "");
  const [status, setStatus] = useState(shot?.status ?? "planned");
  const [notes, setNotes] = useState(shot?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    // Every shot must say which character(s) are in it.
    if (!castNotes.trim()) {
      setError("Add the character(s) in this shot.");
      return;
    }
    setError("");
    setSaving(true);
    await onSave(
      {
        shotNumber,
        description,
        shotSize,
        angle,
        movement,
        lens,
        equipment,
        castNotes: castNotes.trim(),
        status,
        notes,
        sceneId: shot ? shot.sceneId : sceneId,
      },
      shot
    );
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shot ? "Edit Shot" : "Add Shot"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Shot #</Label>
              <Input value={shotNumber} onChange={(e) => setShotNumber(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>Size</Label>
              <select className={selectClass} value={shotSize} onChange={(e) => setShotSize(e.target.value)}>
                {SHOT_SIZES.map((o) => (
                  <option key={o} value={o}>{o || "—"}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((o) => (
                  <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <button
                type="button"
                onClick={() => {
                  const s = suggestShotFields(description);
                  if (s.shotSize) setShotSize(s.shotSize);
                  if (s.angle) setAngle(s.angle);
                  if (s.movement) setMovement(s.movement);
                }}
                disabled={!description.trim()}
                className="text-xs text-red-600 hover:underline disabled:text-slate-300 disabled:no-underline"
              >
                Suggest size/angle/move
              </button>
            </div>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What the camera sees…"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Angle</Label>
              <select className={selectClass} value={angle} onChange={(e) => setAngle(e.target.value)}>
                {ANGLES.map((o) => (
                  <option key={o} value={o}>{o || "—"}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Movement</Label>
              <select className={selectClass} value={movement} onChange={(e) => setMovement(e.target.value)}>
                {MOVEMENTS.map((o) => (
                  <option key={o} value={o}>{o || "—"}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Character *</Label>
              <Input
                value={castNotes}
                onChange={(e) => setCastNotes(e.target.value)}
                placeholder="Who's in it"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Equipment</Label>
              <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Tripod, slider…" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else…" />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save Shot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FlatShotTable({
  shots,
  sceneName,
  canEdit,
  selection,
  onEditShot,
  onDeleteShot,
}: {
  shots: Shot[];
  sceneName: (sceneId: number | null) => string;
  canEdit: boolean;
  selection: Selection;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shot: Shot) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {canEdit && selection.mode && <TableHead className="w-10" />}
            <TableHead className="w-14">#</TableHead>
            <TableHead>Scene</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-16">Size</TableHead>
            <TableHead className="w-24">Angle</TableHead>
            <TableHead className="w-24">Move</TableHead>
            <TableHead className="w-28">Character</TableHead>
            <TableHead className="w-24">Status</TableHead>
            {canEdit && !selection.mode && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shots.map((shot) => (
            <TableRow
              key={shot.id}
              className={
                selection.mode && selection.selected.has(shot.id)
                  ? "bg-slate-50"
                  : undefined
              }
            >
              {canEdit && selection.mode && (
                <TableCell>
                  <SelectBox
                    checked={selection.selected.has(shot.id)}
                    onChange={() => selection.toggle(shot.id)}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{shot.shotNumber || "—"}</TableCell>
              <TableCell className="text-xs text-slate-500">
                {sceneName(shot.sceneId) || "—"}
              </TableCell>
              <TableCell>
                {shot.description || <span className="text-slate-400">—</span>}
              </TableCell>
              <TableCell>{shot.shotSize || "—"}</TableCell>
              <TableCell>{shot.angle || "—"}</TableCell>
              <TableCell>{shot.movement || "—"}</TableCell>
              <TableCell className={shot.castNotes?.trim() ? "" : "text-amber-600"}>
                {shot.castNotes?.trim() || "Add"}
              </TableCell>
              <TableCell>{statusBadge(shot.status)}</TableCell>
              {canEdit && !selection.mode && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onEditShot(shot)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDeleteShot(shot)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ShotCard({
  shot,
  sceneName,
  canEdit,
  selection,
  onEdit,
  onDelete,
}: {
  shot: Shot;
  sceneName: string;
  canEdit: boolean;
  selection: Selection;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const specs = [shot.shotSize, shot.angle, shot.movement].filter(Boolean);
  const isSelected = selection.selected.has(shot.id);
  return (
    <div
      className={
        "rounded-lg border bg-white p-4 flex flex-col " +
        (selection.mode && isSelected
          ? "border-slate-900 ring-1 ring-slate-900"
          : "border-slate-200")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {canEdit && selection.mode && (
            <SelectBox checked={isSelected} onChange={() => selection.toggle(shot.id)} />
          )}
          <span className="font-semibold text-slate-900">
            {shot.shotNumber ? `Shot ${shot.shotNumber}` : "Shot"}
          </span>
        </div>
        {statusBadge(shot.status)}
      </div>
      {sceneName && <p className="text-xs text-slate-400 mt-0.5">{sceneName}</p>}
      <p className="text-sm text-slate-700 mt-2 flex-1">
        {shot.description || <span className="text-slate-400">No description</span>}
      </p>
      <p
        className={
          "text-xs mt-1 " + (shot.castNotes?.trim() ? "text-slate-400" : "text-amber-600")
        }
      >
        Character: {shot.castNotes?.trim() || "Add who's in it"}
      </p>
      {specs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {specs.map((s, i) => (
            <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {s}
            </span>
          ))}
        </div>
      )}
      {canEdit && !selection.mode && (
        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-100">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </Button>
        </div>
      )}
    </div>
  );
}

function BulkAddDialog({
  scenes,
  onClose,
  onAdd,
}: {
  scenes: Scene[];
  onClose: () => void;
  onAdd: (text: string, sceneId: number | null) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sceneId, setSceneId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const previewCount = parseShotLines(text).length;

  async function submit() {
    if (previewCount === 0) return;
    setSaving(true);
    await onAdd(text, sceneId ? parseInt(sceneId, 10) : null);
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paste shots as text</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            One shot per line. Either type a plain description per line, or use{" "}
            <code className="bg-slate-100 px-1 rounded">|</code> to separate columns in
            this order:
          </p>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-md px-3 py-2 font-mono">
            number | size | angle | movement | character | description
            <br />
            1 | WS | Eye-level | Static | JANE | Establishing shot of the diner
            <br />
            Close on the coffee cup as steam rises
          </p>
          <div className="space-y-1.5">
            <Label>Add all to scene (optional)</Label>
            <select className={selectClass} value={sceneId} onChange={(e) => setSceneId(e.target.value)}>
              <option value="">No scene</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sceneNumber ? s.sceneNumber + " " : ""}
                  {s.heading}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="w-full min-h-[200px] rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"1 | WS | | Dolly | JANE | Wide of the kitchen\nCloser on the knife block\n..."}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || previewCount === 0}>
            {saving ? "Adding…" : `Add ${previewCount} shot${previewCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GenerateFromScriptDialog({
  busy,
  onClose,
  onGenerate,
}: {
  busy: boolean;
  onClose: () => void;
  onGenerate: (mode: "action" | "dialogue" | "both") => Promise<void>;
}) {
  const [mode, setMode] = useState<"action" | "dialogue" | "both">("action");

  const options: {
    id: "action" | "dialogue" | "both";
    title: string;
    desc: string;
  }[] = [
    {
      id: "action",
      title: "Action coverage",
      desc: "An establishing shot plus one shot per action beat.",
    },
    {
      id: "dialogue",
      title: "Dialogue coverage",
      desc: "Establishing, a master/two-shot, OTS singles for each speaker, and CUs on principals.",
    },
    {
      id: "both",
      title: "Full coverage",
      desc: "Establishing, action beats, plus full dialogue coverage (master, OTS, CUs).",
    },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate scenes &amp; shots from script</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            Reads your saved script and builds a shot list. Choose how much
            coverage to generate:
          </p>
          {options.map((o) => (
            <label
              key={o.id}
              className={
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors " +
                (mode === o.id
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 hover:border-slate-300")
              }
            >
              <input
                type="radio"
                name="shot-mode"
                value={o.id}
                checked={mode === o.id}
                onChange={() => setMode(o.id)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  {o.title}
                </span>
                <span className="block text-xs text-slate-500">{o.desc}</span>
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => onGenerate(mode)} disabled={busy}>
            {busy ? "Reading script…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
