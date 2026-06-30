"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { MapPin, Search, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Leaflet must be loaded client-side only
const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-slate-100 rounded-lg">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  ),
});

export type ShootDayLocation = {
  id: number;
  dayNumber: number;
  shootDate: string | null;
  location: string | null;
  locationAddress: string | null;
  locationNotes: string | null;
  lat: string | null;
  lng: string | null;
};

type Props = {
  projectId: number;
  days: ShootDayLocation[];
  canManage: boolean;
};

type GeoState = "idle" | "loading" | "error";

export function LocationsBoard({ projectId, days: initialDays, canManage }: Props) {
  const [days, setDays] = useState(initialDays);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialDays.find((d) => d.lat && d.lng)?.id ?? null
  );
  const [geoState, setGeoState] = useState<Record<number, GeoState>>({});

  const geocode = useCallback(
    async (day: ShootDayLocation) => {
      const query = day.locationAddress || day.location;
      if (!query) return;
      setGeoState((s) => ({ ...s, [day.id]: "loading" }));
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        if (!data[0]) throw new Error("Not found");
        const { lat, lon } = data[0];
        await fetch(`/api/projects/${projectId}/shoot-days/${day.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng: lon }),
        });
        setDays((prev) =>
          prev.map((d) => (d.id === day.id ? { ...d, lat, lng: lon } : d))
        );
        setSelectedId(day.id);
        setGeoState((s) => ({ ...s, [day.id]: "idle" }));
      } catch {
        setGeoState((s) => ({ ...s, [day.id]: "error" }));
      }
    },
    [projectId]
  );

  const located = days.filter((d) => d.lat && d.lng);
  const unlocated = days.filter((d) => !(d.lat && d.lng));
  const hasAny = days.length > 0;
  const selectedDay = days.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      {/* Map */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-[400px] sm:h-[480px]">
          {located.length > 0 ? (
            <LocationMap
              pins={located.map((d) => ({
                id: d.id,
                lat: parseFloat(d.lat!),
                lng: parseFloat(d.lng!),
                label: d.location || d.locationAddress || `Day ${d.dayNumber}`,
                selected: d.id === selectedId,
              }))}
              onSelect={setSelectedId}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <MapPin className="h-10 w-10" />
              <p className="text-sm font-medium">No locations pinned yet</p>
              <p className="text-xs text-center max-w-xs">
                Add addresses to your shoot days on the Schedule tab, then use the
                &quot;Pin on map&quot; button below.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Location list */}
      {hasAny ? (
        <div className="space-y-3">
          {located.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Pinned ({located.length})
              </h3>
              <div className="space-y-2">
                {located.map((day) => (
                  <LocationCard
                    key={day.id}
                    day={day}
                    selected={day.id === selectedId}
                    onSelect={() => setSelectedId(day.id)}
                    geoState={geoState[day.id] ?? "idle"}
                    canManage={canManage}
                    onGeocode={() => geocode(day)}
                    pinned
                  />
                ))}
              </div>
            </section>
          )}

          {unlocated.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Not pinned ({unlocated.length})
              </h3>
              <div className="space-y-2">
                {unlocated.map((day) => (
                  <LocationCard
                    key={day.id}
                    day={day}
                    selected={false}
                    onSelect={() => {}}
                    geoState={geoState[day.id] ?? "idle"}
                    canManage={canManage}
                    onGeocode={() => geocode(day)}
                    pinned={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500 text-center py-8">
          No shoot days yet. Add shoot days on the{" "}
          <a href="schedule" className="text-red-600 underline underline-offset-2">
            Schedule tab
          </a>{" "}
          and fill in their locations.
        </p>
      )}

      {selectedDay && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1 text-sm">
          <p className="font-semibold text-slate-900">
            Day {selectedDay.dayNumber}
            {selectedDay.shootDate ? ` — ${selectedDay.shootDate}` : ""}
          </p>
          {selectedDay.location && (
            <p className="text-slate-700">{selectedDay.location}</p>
          )}
          {selectedDay.locationAddress && (
            <p className="text-slate-500">{selectedDay.locationAddress}</p>
          )}
          {selectedDay.locationNotes && (
            <p className="text-slate-400 italic">{selectedDay.locationNotes}</p>
          )}
          {selectedDay.locationAddress && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(selectedDay.locationAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline mt-1"
            >
              Open in Google Maps <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function LocationCard({
  day,
  selected,
  onSelect,
  geoState,
  canManage,
  onGeocode,
  pinned,
}: {
  day: ShootDayLocation;
  selected: boolean;
  onSelect: () => void;
  geoState: GeoState;
  canManage: boolean;
  onGeocode: () => void;
  pinned: boolean;
}) {
  const addressLine = day.locationAddress || day.location;

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3 flex items-start gap-3 transition-colors",
        selected ? "border-red-300 bg-red-50" : "border-slate-200",
        pinned && "cursor-pointer hover:border-slate-300"
      )}
      onClick={pinned ? onSelect : undefined}
    >
      <MapPin
        className={cn(
          "h-4 w-4 mt-0.5 shrink-0",
          pinned ? "text-red-500" : "text-slate-300"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          Day {day.dayNumber}
          {day.shootDate ? ` · ${day.shootDate}` : ""}
        </p>
        {day.location && (
          <p className="text-sm text-slate-700 truncate">{day.location}</p>
        )}
        {day.locationAddress && (
          <p className="text-xs text-slate-400 truncate">{day.locationAddress}</p>
        )}
        {!addressLine && (
          <p className="text-xs text-slate-400 italic">No address entered</p>
        )}
      </div>
      {!pinned && canManage && addressLine && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-7 text-xs"
          disabled={geoState === "loading"}
          onClick={(e) => {
            e.stopPropagation();
            onGeocode();
          }}
          aria-label={`Pin Day ${day.dayNumber} on map`}
        >
          {geoState === "loading" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : geoState === "error" ? (
            <AlertCircle className="h-3 w-3 text-red-500" />
          ) : (
            <Search className="h-3 w-3" />
          )}
          {geoState === "error" ? "Retry" : "Pin on map"}
        </Button>
      )}
      {pinned && canManage && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 h-7 text-xs text-slate-400"
          disabled={geoState === "loading"}
          onClick={(e) => {
            e.stopPropagation();
            onGeocode();
          }}
          aria-label={`Re-geocode Day ${day.dayNumber}`}
        >
          {geoState === "loading" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Search className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}
