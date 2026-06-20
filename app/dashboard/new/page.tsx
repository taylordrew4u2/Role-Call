"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clapperboard, ArrowLeft, Users2, Check } from "lucide-react";
import { PRODUCTION_TYPES, getProductionType } from "@/lib/production-types";

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [projectType, setProjectType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [description, setDescription] = useState("");
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
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Something went wrong.");
        return;
      }
      const project = await res.json();
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
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
          <Clapperboard className="h-6 w-6 text-red-600" />
          RoleCall
        </div>
      </header>

      <main className="flex-1 w-full px-4 py-10">
        {/* Step indicator */}
        <div className="max-w-2xl mx-auto mb-8 flex items-center justify-center gap-3 text-sm">
          <span className={step === 1 ? "font-semibold text-slate-900" : "text-slate-400"}>
            1. What are you making?
          </span>
          <span className="text-slate-300">→</span>
          <span className={step === 2 ? "font-semibold text-slate-900" : "text-slate-400"}>
            2. Project details
          </span>
        </div>

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
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? "Creating…" : "Create Project →"}
                    </Button>
                  </div>
                </form>
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
      </main>
    </div>
  );
}
