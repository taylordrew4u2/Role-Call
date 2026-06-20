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
} from "lucide-react";
import type { Scene, Shot } from "@/lib/db/schema";
import { parseShotLines } from "@/lib/parse-shots";

type ViewMode = "scene" | "table" | "cards";

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

export function ShotListBoard({
  projectId,
  isOwner,
  initialScenes,
  initialShots,
}: {
  projectId: number;
  isOwner: boolean;
  initialScenes: Scene[];
  initialShots: Shot[];
}) {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [shots, setShots] = useState<Shot[]>(initialShots);

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

  const api = `/api/projects/${projectId}`;

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
      Lens: s.lens ?? "",
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
          `${r.Scene ? r.Scene + " — " : ""}${r.Shot}. ${[r.Size, r.Angle, r.Movement, r.Lens]
            .filter(Boolean)
            .join(", ")}${r.Description ? " — " + r.Description : ""}`
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Shot list copied to clipboard.");
    } catch {
      alert("Couldn't copy automatically — your browser blocked it.");
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

  async function deleteShot(shot: Shot) {
    if (!confirm("Delete this shot?")) return;
    const res = await fetch(`${api}/shots/${shot.id}`, { method: "DELETE" });
    if (res.ok) setShots((s) => s.filter((x) => x.id !== shot.id));
  }

  const unlinkedShots = shots.filter((s) => s.sceneId === null);

  const hasShots = shots.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Scenes &amp; Shot List</h2>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="gap-1.5"
            >
              <ClipboardPaste className="h-4 w-4" /> Paste shots
            </Button>
            <Button size="sm" onClick={() => setSceneDialog({ open: true, scene: null })}>
              <Plus className="h-4 w-4 mr-1" /> Add Scene
            </Button>
          </div>
        )}
      </div>

      {/* View switcher + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(
            [
              { id: "scene", label: "By Scene", icon: List },
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
            {isOwner
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
              isOwner={isOwner}
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
              isOwner={isOwner}
              onEditScene={() => {}}
              onDeleteScene={() => {}}
              onAddShot={() => setShotDialog({ open: true, shot: null, sceneId: null })}
              onEditShot={(shot) => setShotDialog({ open: true, shot, sceneId: null })}
              onDeleteShot={deleteShot}
            />
          )}

          {isOwner && scenes.length > 0 && (
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

      {/* Flat table view */}
      {viewMode === "table" && hasShots && (
        <FlatShotTable
          shots={shots}
          sceneName={sceneName}
          isOwner={isOwner}
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
              isOwner={isOwner}
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
  isOwner,
  onEditScene,
  onDeleteScene,
  onAddShot,
  onEditShot,
  onDeleteShot,
}: {
  scene: Scene | null;
  shots: Shot[];
  isOwner: boolean;
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
        {isOwner && (
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
                <TableHead className="w-14">#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-16">Size</TableHead>
                <TableHead className="w-24">Angle</TableHead>
                <TableHead className="w-24">Move</TableHead>
                <TableHead className="w-20">Lens</TableHead>
                <TableHead className="w-24">Status</TableHead>
                {isOwner && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shots.map((shot) => (
                <TableRow key={shot.id}>
                  <TableCell className="font-medium">{shot.shotNumber || "—"}</TableCell>
                  <TableCell className="max-w-xs">
                    {shot.description || <span className="text-slate-400">—</span>}
                    {shot.castNotes && (
                      <span className="block text-xs text-slate-400">Cast: {shot.castNotes}</span>
                    )}
                  </TableCell>
                  <TableCell>{shot.shotSize || "—"}</TableCell>
                  <TableCell>{shot.angle || "—"}</TableCell>
                  <TableCell>{shot.movement || "—"}</TableCell>
                  <TableCell>{shot.lens || "—"}</TableCell>
                  <TableCell>{statusBadge(shot.status)}</TableCell>
                  {isOwner && (
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
  const [lens, setLens] = useState(shot?.lens ?? "");
  const [equipment, setEquipment] = useState(shot?.equipment ?? "");
  const [castNotes, setCastNotes] = useState(shot?.castNotes ?? "");
  const [status, setStatus] = useState(shot?.status ?? "planned");
  const [notes, setNotes] = useState(shot?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
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
        castNotes,
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
            <Label>Description</Label>
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
              <Label>Lens</Label>
              <Input value={lens} onChange={(e) => setLens(e.target.value)} placeholder="35mm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Equipment</Label>
              <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Tripod, slider…" />
            </div>
            <div className="space-y-1.5">
              <Label>Cast</Label>
              <Input value={castNotes} onChange={(e) => setCastNotes(e.target.value)} placeholder="Who's in it" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else…" />
          </div>
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
  isOwner,
  onEditShot,
  onDeleteShot,
}: {
  shots: Shot[];
  sceneName: (sceneId: number | null) => string;
  isOwner: boolean;
  onEditShot: (shot: Shot) => void;
  onDeleteShot: (shot: Shot) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">#</TableHead>
            <TableHead>Scene</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-16">Size</TableHead>
            <TableHead className="w-24">Angle</TableHead>
            <TableHead className="w-24">Move</TableHead>
            <TableHead className="w-20">Lens</TableHead>
            <TableHead className="w-24">Status</TableHead>
            {isOwner && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shots.map((shot) => (
            <TableRow key={shot.id}>
              <TableCell className="font-medium">{shot.shotNumber || "—"}</TableCell>
              <TableCell className="text-xs text-slate-500">
                {sceneName(shot.sceneId) || "—"}
              </TableCell>
              <TableCell>{shot.description || <span className="text-slate-400">—</span>}</TableCell>
              <TableCell>{shot.shotSize || "—"}</TableCell>
              <TableCell>{shot.angle || "—"}</TableCell>
              <TableCell>{shot.movement || "—"}</TableCell>
              <TableCell>{shot.lens || "—"}</TableCell>
              <TableCell>{statusBadge(shot.status)}</TableCell>
              {isOwner && (
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
  isOwner,
  onEdit,
  onDelete,
}: {
  shot: Shot;
  sceneName: string;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const specs = [shot.shotSize, shot.angle, shot.movement, shot.lens].filter(Boolean);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-slate-900">
          {shot.shotNumber ? `Shot ${shot.shotNumber}` : "Shot"}
        </span>
        {statusBadge(shot.status)}
      </div>
      {sceneName && <p className="text-xs text-slate-400 mt-0.5">{sceneName}</p>}
      <p className="text-sm text-slate-700 mt-2 flex-1">
        {shot.description || <span className="text-slate-400">No description</span>}
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
      {isOwner && (
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
            number | size | angle | movement | lens | description
            <br />
            1 | WS | Eye-level | Static | 35mm | Establishing shot of the diner
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
            placeholder={"1 | WS | | Dolly | | Wide of the kitchen\nCloser on the knife block\n..."}
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
