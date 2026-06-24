"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Drama, UserPlus, Plus, Trash2, Mail, Link as LinkIcon, Pencil, Sparkles, Loader2 } from "lucide-react";
import type { ProjectMember } from "@/lib/db/schema";
import { toast } from "@/components/Toaster";

export function CastBoard({
  projectId,
  isOwner,
  initialMembers,
}: {
  projectId: number;
  isOwner: boolean;
  initialMembers: ProjectMember[];
}) {
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers);
  const [dialog, setDialog] = useState<{
    mode: "cast" | "crew";
    member: ProjectMember | null;
  } | null>(null);
  const [generating, setGenerating] = useState(false);

  const cast = members.filter((m) => m.kind === "cast");
  const crew = members.filter((m) => m.kind !== "cast");

  async function generateFromScript() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/cast/from-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Couldn't read characters from the script.");
        return;
      }
      const created: ProjectMember[] = data.created ?? [];
      if (created.length === 0) {
        toast(
          data.skipped
            ? "Every character in the script is already in the cast."
            : "No new characters found."
        );
        return;
      }
      setMembers((m) => [...m, ...created]);
      toast(
        `Added ${created.length} role${created.length !== 1 ? "s" : ""} from the script.` +
          (data.skipped ? ` ${data.skipped} already in the cast.` : "") +
          " Add who's playing each one."
      );
    } catch {
      toast("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveMember(
    data: { displayName: string; character?: string; email?: string; kind: "cast" | "crew" },
    existing: ProjectMember | null
  ) {
    if (existing) {
      const res = await fetch(`/api/projects/${projectId}/members/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setMembers((m) => m.map((x) => (x.id === updated.id ? updated : x)));
        setDialog(null);
        return true;
      }
      return false;
    }
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      setMembers((m) => [...m, created]);
      setDialog(null);
      return true;
    }
    return false;
  }

  async function removeMember(member: ProjectMember) {
    if (!confirm(`Remove ${member.displayName}?`)) return;
    const res = await fetch(`/api/projects/${projectId}/members/${member.id}`, {
      method: "DELETE",
    });
    if (res.ok) setMembers((m) => m.filter((x) => x.id !== member.id));
  }

  async function copyInviteLink(member: ProjectMember) {
    const link = `${window.location.origin}/api/invite?projectId=${projectId}&memberId=${member.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast(`Invite link copied — send it to ${member.displayName}.`);
    } catch {
      prompt("Copy this invite link:", link);
    }
  }

  function MemberRow({ member }: { member: ProjectMember }) {
    // A cast role generated from the script has its character set but no actor
    // assigned yet (blank displayName).
    const unassigned = member.kind === "cast" && !member.displayName.trim();
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
        <div className="min-w-0">
          {unassigned ? (
            <p className="text-sm font-medium text-slate-900 truncate">
              {member.character || "Unnamed role"}
              <span className="text-slate-400 font-normal"> — not cast yet</span>
            </p>
          ) : (
            <p className="text-sm font-medium text-slate-900 truncate">
              {member.displayName}
              {member.character && (
                <span className="text-slate-400 font-normal">
                  {" "}
                  as {member.character}
                </span>
              )}
            </p>
          )}
          <p className="text-xs text-slate-400 truncate">
            {member.email || "No email"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unassigned ? (
            isOwner ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialog({ mode: "cast", member })}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Add actor
              </Button>
            ) : (
              <Badge variant="secondary">Needs casting</Badge>
            )
          ) : (
            <Badge variant={member.status === "active" ? "success" : "secondary"}>
              {member.status === "active" ? "Joined" : "Invited"}
            </Badge>
          )}
          {isOwner && !unassigned && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyInviteLink(member)}
              title="Copy invite link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>
          )}
          {isOwner && !unassigned && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setDialog({ mode: member.kind === "cast" ? "cast" : "crew", member })
              }
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {isOwner && (
            <Button size="sm" variant="ghost" onClick={() => removeMember(member)}>
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cast */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Drama className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">
              Cast <span className="text-slate-400 font-normal">({cast.length})</span>
            </h2>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={generateFromScript}
                disabled={generating}
                title="Detect characters from the script and add them as roles"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Generate from script
              </Button>
              <Button size="sm" onClick={() => setDialog({ mode: "cast", member: null })}>
                <Plus className="h-4 w-4 mr-1" /> Add Actor
              </Button>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white">
          {cast.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400">
              No actors yet.{" "}
              {isOwner
                ? "Add cast manually, or use “Generate from script” to pull every character from your screenplay."
                : ""}
            </p>
          ) : (
            cast.map((m) => <MemberRow key={m.id} member={m} />)
          )}
        </div>
      </section>

      {/* Crew */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">
              Crew &amp; collaborators{" "}
              <span className="text-slate-400 font-normal">({crew.length})</span>
            </h2>
          </div>
          {isOwner && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialog({ mode: "crew", member: null })}
            >
              <Mail className="h-4 w-4 mr-1" /> Invite Person
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white">
          {crew.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400">
              No crew yet. {isOwner ? "Invite people to collaborate on this project." : ""}
            </p>
          ) : (
            crew.map((m) => <MemberRow key={m.id} member={m} />)
          )}
        </div>
      </section>

      {dialog && (
        <PersonDialog
          mode={dialog.mode}
          member={dialog.member}
          onClose={() => setDialog(null)}
          onSave={saveMember}
        />
      )}
    </div>
  );
}

function PersonDialog({
  mode,
  member,
  onClose,
  onSave,
}: {
  mode: "cast" | "crew";
  member: ProjectMember | null;
  onClose: () => void;
  onSave: (
    data: { displayName: string; character?: string; email?: string; kind: "cast" | "crew" },
    existing: ProjectMember | null
  ) => Promise<boolean>;
}) {
  const [displayName, setDisplayName] = useState(member?.displayName ?? "");
  const [character, setCharacter] = useState(member?.character ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isCast = mode === "cast";
  const isEdit = member !== null;
  // Editing a script-generated role that has no actor yet.
  const casting = isCast && member !== null && !member.displayName.trim();

  async function submit() {
    if (!displayName.trim()) {
      setError("A name is required.");
      return;
    }
    setError("");
    setSaving(true);
    const ok = await onSave(
      {
        displayName,
        character: isCast ? character : undefined,
        email,
        kind: mode,
      },
      member
    );
    setSaving(false);
    if (!ok) setError("Something went wrong. Please try again.");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCast ? <Drama className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {casting
              ? `Cast ${member?.character || "this role"}`
              : isEdit
                ? "Edit"
                : isCast
                  ? "Add Actor"
                  : "Invite Person"}
          </DialogTitle>
          <DialogDescription>
            {casting
              ? "Add who's playing this role. Email is optional — add it to send a join invite."
              : isCast
                ? "Cast member details. Email is optional — add it to send a join invite."
                : "Project collaborator. They'll get an email join link if email is set up."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              placeholder={isCast ? "e.g. Alex Rivera" : "e.g. Jordan Smith"}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          {isCast && (
            <div className="space-y-1">
              <Label>Character</Label>
              <Input
                placeholder="e.g. Detective Mara"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label>Email {isCast ? "(optional)" : ""}</Label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !displayName.trim()}>
            {saving
              ? "Saving…"
              : casting
                ? "Cast role"
                : isEdit
                  ? "Save"
                  : isCast
                    ? "Add Actor"
                    : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
