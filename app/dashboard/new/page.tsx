"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clapperboard, ArrowLeft, Users2, Check, Layers, Clock, MapPin, UtensilsCrossed, LogOut } from "lucide-react";
import { PRODUCTION_TYPES, getProductionType } from "@/lib/production-types";

export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProjectForm />
    </Suspense>
  );
}

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seriesParam = searchParams.get("series");
  const seriesId = seriesParam ? parseInt(seriesParam, 10) : null;
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 & 2: project basics
  const [projectType, setProjectType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [description, setDescription] = useState("");

  // Step 3: call sheet / first shoot day
  const [callTime, setCallTime] = useState("");
  const [lunchTime, setLunchTime] = useState("");
  const [wrapTime, setWrapTime] = useState("");
  const [location, setLocation] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationNotes, setLocationNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = getProductionType(projectType);

  function chooseType(id: string) {
    setProjectType(id);
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shootDate: shootDate || null,
          description,
          projectType: projectType || null,
          seriesId: seriesId && !isNaN(seriesId) ? seriesId : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Something went wrong.");
        return;
      }
      const project = await res.json();

      // If any call sheet fields were filled in, create the first shoot day.
      const hasCallSheet =
        callTime || lunchTime || wrapTime || location || locationAddress || locationNotes;
      if (hasCallSheet) {
        await fetch(`/api/projects/${project.id}/shoot-days`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayNumber: 1,
            shootDate: shootDate || null,
            callTime: callTime || null,
            lunchTime: lunchTime || null,
            wrapTime: wrapTime || null,
            location: location || null,
            locationAddress: locationAddress || null,
            locationNotes: locationNotes || null,
          }),
        });
      }

      router.push(`/dashboard/${project.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" aria-label="Back to dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
          <Clapperboard className="h-6 w-6 text-red-600" />
          RoleCall
        </div>
      </header>

      <main className="flex-1 w-full px-4 py-10">
        {seriesId && !isNaN(seriesId) && (
          <div className="max-w-2xl mx-auto mb-6 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <Layers className="h-4 w-4 shrink-0" />
            This project will be added to your series, and the whole series team
            joins it automatically.
          </div>
        )}

        {/* Step indicator */}
        <div className="max-w-2xl mx-auto mb-8 flex items-center justify-center gap-3 text-sm">
          <span className={step === 1 ? "font-semibold text-slate-900" : "text-slate-400"}>
            1. What are you making?
          </span>
          <span className="text-slate-300">→</span>
          <span className={step === 2 ? "font-semibold text-slate-900" : "text-slate-400"}>
            2. Project details
          </span>
          <span className="text-slate-300">→</span>
          <span className={step === 3 ? "font-semibold text-slate-900" : "text-slate-400"}>
            3. Call sheet
          </span>
        </div>

        {/* Step 1: Production type */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900">What are you making?</h1>
              <p className="text-slate-500 text-sm mt-1">
                Pick the type of production — we&apos;ll suggest the crew you typically need.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {PRODUCTION_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => chooseType(t.id)}
                  className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-red-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{t.emoji}</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users2 className="h-3.5 w-3.5" />
                      {t.crew}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900">{t.label}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t.blurb}</p>
                  <p className="text-xs text-slate-400 mt-3">
                    {t.recommendedRoles.length} recommended role
                    {t.recommendedRoles.length !== 1 ? "s" : ""}
                  </p>
                </button>
              ))}
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setProjectType("");
                  setStep(2);
                }}
                className="text-sm text-slate-400 hover:text-slate-600 underline"
              >
                Skip — I&apos;ll set it up myself
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Project details */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto grid gap-6 md:grid-cols-[1fr_280px]">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Project details</CardTitle>
                <CardDescription>
                  {selected
                    ? `Setting up a ${selected.label.toLowerCase()}.`
                    : "Create your project."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g. The Last Frame"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="shootDate">Shoot Date</Label>
                    <Input
                      id="shootDate"
                      type="date"
                      value={shootDate}
                      onChange={(e) => setShootDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      className="flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                      placeholder="A brief synopsis or production notes…"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={!title.trim()}
                      onClick={() => setStep(3)}
                    >
                      Next: Call Sheet →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* "What's needed" recap */}
            {selected && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 h-fit">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selected.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{selected.label}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Users2 className="h-3 w-3" /> {selected.crew}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-700 mt-4 mb-2">
                  Crew you&apos;ll typically need:
                </p>
                <ul className="space-y-1">
                  {selected.recommendedRoles.map((r) => (
                    <li key={r} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-400 mt-4">
                  You can still assign every role later — this just focuses the board on
                  what matters for your shoot.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Call sheet */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Call sheet</CardTitle>
                <CardDescription>
                  Set up times and location for your shoot. This creates your first shoot day — you can add more in the Schedule tab.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Times */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Times
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="callTime" className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" /> Call Time
                      </Label>
                      <Input
                        id="callTime"
                        placeholder="7:00 AM"
                        value={callTime}
                        onChange={(e) => setCallTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lunchTime" className="flex items-center gap-1.5">
                        <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" /> Lunch
                      </Label>
                      <Input
                        id="lunchTime"
                        placeholder="12:30 PM"
                        value={lunchTime}
                        onChange={(e) => setLunchTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="wrapTime" className="flex items-center gap-1.5">
                        <LogOut className="h-3.5 w-3.5 text-slate-500" /> Wrap
                      </Label>
                      <Input
                        id="wrapTime"
                        placeholder="6:00 PM"
                        value={wrapTime}
                        onChange={(e) => setWrapTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Location
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="location" className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-red-500" /> Location Name
                      </Label>
                      <Input
                        id="location"
                        placeholder="e.g. Main Set, Studio A, Rooftop"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="locationAddress">Address</Label>
                      <Input
                        id="locationAddress"
                        placeholder="123 Main St, City, State"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="locationNotes">Parking / Access Notes</Label>
                      <Input
                        id="locationNotes"
                        placeholder="Park in lot B, enter via rear gate"
                        value={locationNotes}
                        onChange={(e) => setLocationNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Creating…" : "Create Project →"}
                  </Button>
                </div>

                <p className="text-xs text-slate-400 text-center">
                  You can skip any field and add it later in the Schedule tab.
                </p>
              </CardContent>
            </Card>
          </form>
        )}
      </main>
    </div>
  );
}
