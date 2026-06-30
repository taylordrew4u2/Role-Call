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
import { CalendarDays, Plus, Pencil, Trash2, Clock, MapPin, UtensilsCrossed, LogOut, Users, Film, Timer } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/Toaster";
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
  const [deleteConfirm, setDeleteConfirm] = useState<ShootDay | null>(null);

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
      } else {
        toast("Couldn't save shoot day. Please try again.", "error");
        return;
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
      } else {
        toast("Couldn't create shoot day. Please try again.", "error");
        return;
      }
    }
    setDayDialog({ open: false, day: null });
  }

  async function deleteDay(day: ShootDay) {
    const res = await fetch(`${api}/shoot-days/${day.id}`, { method: "DELETE" });
    if (res.ok) {
      setDays((d) => d.filter((x) => x.id !== day.id));
      setShots((s) => s.map((x) => (x.shootDayId === day.id ? { ...x, shootDayId: null } : x)));
    }
    setDeleteConfirm(null);
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
          const uniqueSceneCount = new Set(dayShots.map((s) => s.sceneId).filter((id) => id !== null)).size;
          const totalMins = dayShots.length * 5;
          const estHours = Math.floor(totalMins / 60);
          const estMins = totalMins % 60;
          const castMembers = Array.from(
            new Set(
              dayShots.flatMap((s) =>
                s.castNotes
                  ? s.castNotes.split(/,|&|\band\b|\/|\+/i).map((n) => n.trim()).filter(Boolean)
                  : []
              )
            )
          );
          return (
            <div key={day.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              {/* Call Sheet Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">
                        Day {day.dayNumber}
                        {day.shootDate && (
                          <span className="ml-2 font-normal text-slate-500 text-sm">
                            {formatDate(day.shootDate)}
                          </span>
                        )}
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {dayShots.length} shot{dayShots.length !== 1 ? "s" : ""}
                      </span>
                      {uniqueSceneCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          <Film className="h-3 w-3" />{uniqueSceneCount} scene{uniqueSceneCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {dayShots.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Timer className="h-3 w-3" />~{estHours > 0 ? `${estHours}h ` : ""}{estMins}m
                        </span>
                      )}
                    </div>

                    {/* Call / Lunch / Wrap times row */}
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {day.callTime && (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Clock className="h-3 w-3" /> Call {day.callTime}
                        </span>
                      )}
                      {day.lunchTime && (
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <UtensilsCrossed className="h-3 w-3" /> Lunch {day.lunchTime}
                        </span>
                      )}
                      {day.wrapTime && (
                        <span className="flex items-center gap-1 text-slate-600 font-medium">
                          <LogOut className="h-3 w-3" /> Wrap {day.wrapTime}
                        </span>
                      )}
                    </div>

                    {/* Location section */}
                    {(day.location || day.locationAddress || day.locationNotes) && (
                      <div className="mt-2 rounded-md bg-white border border-slate-200 px-3 py-2 text-xs space-y-0.5">
                        {day.location && (
                          <p className="flex items-center gap-1.5 font-medium text-slate-800">
                            <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                            {day.location}
                          </p>
                        )}
                        {day.locationAddress && (
                          <p className="text-slate-500 pl-4">{day.locationAddress}</p>
                        )}
                        {day.locationNotes && (
                          <p className="text-slate-400 pl-4 italic">{day.locationNotes}</p>
                        )}
                      </div>
                    )}

                    {castMembers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 items-center">
                        <Users className="h-3 w-3 text-slate-400 shrink-0" />
                        {castMembers.map((name) => (
                          <span key={name} className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-800">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}

                    {day.notes && (
                      <p className="text-xs text-slate-500 mt-1.5">{day.notes}</p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" aria-label={`Edit Day ${day.dayNumber}`} onClick={() => setDayDialog({ open: true, day })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={`Delete Day ${day.dayNumber}`} onClick={() => setDeleteConfirm(day)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
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

      {deleteConfirm && (
        <Dialog open onOpenChange={(o) => !o && setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Day {deleteConfirm.dayNumber}?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">Its shots become unscheduled.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteDay(deleteConfirm)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  const [callTime, setCallTime] = useState(day?.callTime ?? "");
  const [lunchTime, setLunchTime] = useState(day?.lunchTime ?? "");
  const [wrapTime, setWrapTime] = useState(day?.wrapTime ?? "");
  const [location, setLocation] = useState(day?.location ?? "");
  const [locationAddress, setLocationAddress] = useState(day?.locationAddress ?? "");
  const [locationNotes, setLocationNotes] = useState(day?.locationNotes ?? "");
  const [notes, setNotes] = useState(day?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSave(
      {
        dayNumber: parseInt(dayNumber, 10) || nextDayNumber,
        shootDate: shootDate || null,
        callTime: callTime || null,
        lunchTime: lunchTime || null,
        wrapTime: wrapTime || null,
        location: location || null,
        locationAddress: locationAddress || null,
        locationNotes: locationNotes || null,
        notes: notes || null,
      },
      day
    );
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{day ? `Edit Day ${day.dayNumber}` : "Add Shoot Day"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Day & Date */}
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
              <Label>Shoot Date</Label>
              <Input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} />
            </div>
          </div>

          {/* Call Sheet Times */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Call Sheet Times</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-call-time">Call Time</Label>
                <Input id="dlg-call-time" value={callTime} onChange={(e) => setCallTime(e.target.value)} placeholder="7:00 AM" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-lunch-time">Lunch</Label>
                <Input id="dlg-lunch-time" value={lunchTime} onChange={(e) => setLunchTime(e.target.value)} placeholder="12:30 PM" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-wrap-time">Wrap</Label>
                <Input id="dlg-wrap-time" value={wrapTime} onChange={(e) => setWrapTime(e.target.value)} placeholder="6:00 PM" />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Location</p>
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-location">Location Name</Label>
                <Input id="dlg-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Set, Studio A" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-location-address">Address</Label>
                <Input id="dlg-location-address" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="123 Main St, City, State" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-location-notes">Parking / Access Notes</Label>
                <Input id="dlg-location-notes" value={locationNotes} onChange={(e) => setLocationNotes(e.target.value)} placeholder="Park in lot B, enter via rear gate" />
              </div>
            </div>
          </div>

          {/* General Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="dlg-notes">General Notes</Label>
            <Input id="dlg-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the crew should know" />
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
