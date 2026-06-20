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
import { CalendarDays, Plus, Pencil, Trash2, Clock, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Scene, Shot, ShootDay } from "@/lib/db/schema";

const selectClass =
  "h-8 rounded-md border border-slate-300 bg-white px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500";

export function ScheduleBoard({
  projectId,
  isOwner,
  initialDays,
  initialShots,
  scenes,
}: {
  projectId: number;
  isOwner: boolean;
  initialDays: ShootDay[];
  initialShots: Shot[];
  scenes: Scene[];
}) {
  const [days, setDays] = useState<ShootDay[]>(initialDays);
  const [shots, setShots] = useState<Shot[]>(initialShots);
  const [dayDialog, setDayDialog] = useState<{ open: boolean; day: ShootDay | null }>({
    open: false,
    day: null,
  });

  const api = `/api/projects/${projectId}`;
  const sceneLabel = (sceneId: number | null) => {
    if (sceneId === null) return null;
    const s = scenes.find((x) => x.id === sceneId);
    return s ? `${s.sceneNumber ? s.sceneNumber + " " : ""}${s.heading}` : null;
  };

  async function saveDay(data: Partial<ShootDay>, existing: ShootDay | null) {
    if (existing) {
      const res = await fetch(`${api}/shoot-days/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const u = await res.json();
        setDays((d) => d.map((x) => (x.id === u.id ? u : x)));
      }
    } else {
      const res = await fetch(`${api}/shoot-days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setDays((d) => [...d, created]);
      }
    }
    setDayDialog({ open: false, day: null });
  }

  async function deleteDay(day: ShootDay) {
    if (!confirm(`Delete Day ${day.dayNumber}? Its shots become unscheduled.`)) return;
    const res = await fetch(`${api}/shoot-days/${day.id}`, { method: "DELETE" });
    if (res.ok) {
      setDays((d) => d.filter((x) => x.id !== day.id));
      setShots((s) => s.map((x) => (x.shootDayId === day.id ? { ...x, shootDayId: null } : x)));
    }
  }

  async function moveShot(shot: Shot, shootDayId: number | null) {
    const res = await fetch(`${api}/shots/${shot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shootDayId }),
    });
    if (res.ok) {
      const u = await res.json();
      setShots((s) => s.map((x) => (x.id === u.id ? u : x)));
    }
  }

  const unscheduled = shots.filter((s) => s.shootDayId === null);

  function ShotRow({ shot }: { shot: Shot }) {
    const label = sceneLabel(shot.sceneId);
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-900 truncate">
            <span className="font-medium">{shot.shotNumber || "—"}</span>
            {shot.shotSize ? ` · ${shot.shotSize}` : ""}
            {shot.description ? ` — ${shot.description}` : ""}
          </p>
          {label && <p className="text-xs text-slate-400 truncate">{label}</p>}
        </div>
        {isOwner && (
          <select
            className={selectClass}
            value={shot.shootDayId ?? ""}
            onChange={(e) =>
              moveShot(shot, e.target.value ? parseInt(e.target.value, 10) : null)
            }
          >
            <option value="">Unscheduled</option>
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                Day {d.dayNumber}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Shooting Schedule</h2>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setDayDialog({ open: true, day: null })}>
            <Plus className="h-4 w-4 mr-1" /> Add Shoot Day
          </Button>
        )}
      </div>

      {days.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <CalendarDays className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            No shoot days yet. {isOwner ? "Add a day, then assign shots to it." : ""}
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {days.map((day) => {
          const dayShots = shots.filter((s) => s.shootDayId === day.id);
          return (
            <div key={day.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50">
                <div>
                  <h3 className="font-semibold text-slate-900">Day {day.dayNumber}</h3>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    <span>{formatDate(day.shootDate)}</span>
                    {day.callTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {day.callTime}
                      </span>
                    )}
                    {day.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {day.location}
                      </span>
                    )}
                  </div>
                  {day.notes && <p className="text-xs text-slate-500 mt-1">{day.notes}</p>}
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setDayDialog({ open: true, day })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDay(day)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="px-4">
                {dayShots.length === 0 ? (
                  <p className="py-4 text-sm text-slate-400">
                    No shots scheduled. {isOwner ? "Assign shots from the list below." : ""}
                  </p>
                ) : (
                  dayShots.map((shot) => <ShotRow key={shot.id} shot={shot} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled shots */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">
            Unscheduled shots{" "}
            <span className="text-slate-400 font-normal">({unscheduled.length})</span>
          </h3>
        </div>
        <div className="px-4">
          {unscheduled.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">
              Every shot is scheduled. Build shots in the Shot List tab.
            </p>
          ) : (
            unscheduled.map((shot) => <ShotRow key={shot.id} shot={shot} />)
          )}
        </div>
      </div>

      {dayDialog.open && (
        <DayDialog
          day={dayDialog.day}
          nextDayNumber={days.length + 1}
          onClose={() => setDayDialog({ open: false, day: null })}
          onSave={saveDay}
        />
      )}
    </div>
  );
}

function DayDialog({
  day,
  nextDayNumber,
  onClose,
  onSave,
}: {
  day: ShootDay | null;
  nextDayNumber: number;
  onClose: () => void;
  onSave: (data: Partial<ShootDay>, existing: ShootDay | null) => Promise<void>;
}) {
  const [dayNumber, setDayNumber] = useState(String(day?.dayNumber ?? nextDayNumber));
  const [shootDate, setShootDate] = useState(day?.shootDate ?? "");
  const [location, setLocation] = useState(day?.location ?? "");
  const [callTime, setCallTime] = useState(day?.callTime ?? "");
  const [notes, setNotes] = useState(day?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSave(
      {
        dayNumber: parseInt(dayNumber, 10) || nextDayNumber,
        shootDate: shootDate || null,
        location,
        callTime,
        notes,
      },
      day
    );
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{day ? `Edit Day ${day.dayNumber}` : "Add Shoot Day"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Day #</Label>
              <Input
                type="number"
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Call time</Label>
              <Input value={callTime} onChange={(e) => setCallTime(e.target.value)} placeholder="7:00 AM" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Main set" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the crew should know" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save Day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
