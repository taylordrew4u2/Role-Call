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
import { Plus, Pencil, Trash2, Clapperboard, Film } from "lucide-react";
import type { Scene, Shot } from "@/lib/db/schema";

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

  const api = `/api/projects/${projectId}`;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Scenes &amp; Shot List</h2>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setSceneDialog({ open: true, scene: null })}>
            <Plus className="h-4 w-4 mr-1" /> Add Scene
          </Button>
        )}
      </div>

      {scenes.length === 0 && unlinkedShots.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <Film className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            No scenes yet. {isOwner ? "Add a scene to start building your shot list." : ""}
          </p>
        </div>
      )}

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
