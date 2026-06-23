"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Users,
  Link as LinkIcon,
  Trash2,
  Calendar,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/Toaster";
import { formatDate } from "@/lib/utils";
import type { Project, SeriesMember } from "@/lib/db/schema";

export function SeriesWorkspace({
  seriesId,
  isOwner,
  title,
  description,
  initialProjects,
  initialMembers,
  addableProjects,
}: {
  seriesId: number;
  isOwner: boolean;
  title: string;
  description: string | null;
  initialProjects: Project[];
  initialMembers: SeriesMember[];
  addableProjects: Project[];
}) {
  const router = useRouter();
  const [projectList, setProjectList] = useState(initialProjects);
  const [members, setMembers] = useState(initialMembers);
  const [addable, setAddable] = useState(addableProjects);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"crew" | "cast">("crew");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [addingId, setAddingId] = useState("");

  async function invite() {
    setInviteError("");
    setInviteUrl("");
    if (!name.trim()) {
      setInviteError("A name is required.");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch(`/api/series/${seriesId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, email: email || undefined, kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Couldn't invite.");
        return;
      }
      setMembers((prev) => [...prev, data]);
      setInviteUrl(data.inviteUrl || "");
      setName("");
      setEmail("");
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function copyMemberLink(m: SeriesMember) {
    const link = `${window.location.origin}/api/series-invite?seriesId=${seriesId}&memberId=${m.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast(`Invite link copied — send it to ${m.displayName}.`);
    } catch {
      prompt("Copy this invite link:", link);
    }
  }

  async function removeMember(m: SeriesMember) {
    if (!confirm(`Remove ${m.displayName} from the whole series?`)) return;
    try {
      const res = await fetch(`/api/series/${seriesId}/members/${m.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        toast(d.error || "Couldn't remove member.");
        return;
      }
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      toast(`${m.displayName} removed from the series.`);
    } catch {
      toast("Network error. Please try again.");
    }
  }

  async function addProject() {
    if (!addingId) return;
    const pid = parseInt(addingId, 10);
    try {
      const res = await fetch(`/api/series/${seriesId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast(d.error || "Couldn't add project.");
        return;
      }
      const moved = addable.find((p) => p.id === pid);
      if (moved) {
        setProjectList((prev) => [...prev, moved]);
        setAddable((prev) => prev.filter((p) => p.id !== pid));
      }
      setAddingId("");
      toast("Project added to the series.");
      router.refresh();
    } catch {
      toast("Network error. Please try again.");
    }
  }

  async function detachProject(p: Project) {
    if (!confirm(`Remove "${p.title}" from this series? The project itself isn't deleted.`)) return;
    try {
      const res = await fetch(`/api/series/${seriesId}/projects?projectId=${p.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        toast(d.error || "Couldn't remove project.");
        return;
      }
      setProjectList((prev) => prev.filter((x) => x.id !== p.id));
      setAddable((prev) => [...prev, p]);
      toast("Project removed from the series.");
    } catch {
      toast("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-1 w-fit rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 mb-2">
          <Layers className="h-3 w-3" /> Series
        </span>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Film className="h-4 w-4" /> Projects ({projectList.length})
            </div>
            {isOwner && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/new?series=${seriesId}`}>
                  <Plus className="h-4 w-4 mr-1" /> New project
                </Link>
              </Button>
            )}
          </div>

          {isOwner && addable.length > 0 && (
            <div className="flex items-center gap-2 mb-4 rounded-lg border border-slate-200 bg-white p-3">
              <select
                value={addingId}
                onChange={(e) => setAddingId(e.target.value)}
                className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                <option value="">Add an existing project…</option>
                {addable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={addProject} disabled={!addingId}>
                Add
              </Button>
            </div>
          )}

          {projectList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Film className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No projects in this series yet.</p>
              {isOwner && (
                <Button asChild size="sm" className="mt-3">
                  <Link href={`/dashboard/new?series=${seriesId}`}>
                    <Plus className="h-4 w-4 mr-1" /> Create the first one
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {projectList.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:shadow-sm transition-shadow"
                >
                  <Link href={`/dashboard/${p.id}`} className="min-w-0 flex-1 group">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-red-600">
                      {p.title}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(p.shootDate)}
                    </p>
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => detachProject(p)}
                      title="Remove from series"
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Team */}
        <aside>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4" /> Series team ({members.length})
              </div>
              {isOwner && (
                <button
                  onClick={() => {
                    setInviteUrl("");
                    setInviteError("");
                    setInviteOpen(true);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md px-2 py-1 transition-colors font-medium"
                >
                  + Invite
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No members yet. Everyone you invite here joins every project in the series.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {m.displayName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{m.email ?? "No email"}</p>
                    </div>
                    <div className="ml-2 flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {m.kind}
                      </Badge>
                      {m.status === "invited" && (
                        <span className="text-[10px] text-amber-600 font-medium">invited</span>
                      )}
                      {isOwner && (
                        <>
                          <button
                            onClick={() => copyMemberLink(m)}
                            title="Copy invite link"
                            className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition-colors"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removeMember(m)}
                            title="Remove from series"
                            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Invite to the series
            </DialogTitle>
            <DialogDescription>
              They’ll be added to every project in this series. Enter a name to get a
              copyable invite link; email is optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sm-name">Display name</Label>
              <Input
                id="sm-name"
                placeholder="e.g. Jordan Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-email">
                Email <span className="text-slate-400">(optional)</span>
              </Label>
              <Input
                id="sm-email"
                type="email"
                placeholder="jordan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-kind">Role type</Label>
              <select
                id="sm-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as "crew" | "cast")}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                <option value="crew">Crew</option>
                <option value="cast">Cast</option>
              </select>
            </div>
            {inviteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{inviteError}</p>
            )}
            {inviteUrl && (
              <div className="space-y-1.5">
                <Label>Invite link</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(inviteUrl);
                      toast("Invite link copied.");
                    }}
                    className="shrink-0"
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Anyone with this link joins the whole series.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={invite} disabled={inviting} className="w-full">
              {inviting ? "Creating…" : "Create invite link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
