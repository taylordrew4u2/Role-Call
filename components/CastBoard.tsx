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
import { Drama, UserPlus, Plus, Trash2, Mail } from "lucide-react";
import type { ProjectMember } from "@/lib/db/schema";

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
  const [dialog, setDialog] = useState<null | "cast" | "crew">(null);

  const cast = members.filter((m) => m.kind === "cast");
  const crew = members.filter((m) => m.kind !== "cast");

  async function addMember(data: {
    displayName: string;
    character?: string;
    email?: string;
    kind: "cast" | "crew";
  }) {
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

  function MemberRow({ member }: { member: ProjectMember }) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {member.displayName}
            {member.character && (
              <span className="text-slate-400 font-normal">
                {" "}
                as {member.character}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-400 truncate">
            {member.email || "No email"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={member.status === "active" ? "success" : "secondary"}>
            {member.status === "active" ? "Joined" : "Invited"}
          </Badge>
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
            <Button size="sm" onClick={() => setDialog("cast")}>
              <Plus className="h-4 w-4 mr-1" /> Add Actor
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white">
          {cast.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400">
              No actors yet. {isOwner ? "Add your cast and the characters they play." : ""}
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
            <Button size="sm" variant="outline" onClick={() => setDialog("crew")}>
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
          mode={dialog}
          onClose={() => setDialog(null)}
          onSave={addMember}
        />
      )}
    </div>
  );
}

function PersonDialog({
  mode,
  onClose,
  onSave,
}: {
  mode: "cast" | "crew";
  onClose: () => void;
  onSave: (data: {
    displayName: string;
    character?: string;
    email?: string;
    kind: "cast" | "crew";
  }) => Promise<boolean>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [character, setCharacter] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isCast = mode === "cast";

  async function submit() {
    if (!displayName.trim()) {
      setError("A name is required.");
      return;
    }
    setError("");
    setSaving(true);
    const ok = await onSave({
      displayName,
      character: isCast ? character : undefined,
      email,
      kind: mode,
    });
    setSaving(false);
    if (!ok) setError("Something went wrong. Please try again.");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCast ? <Drama className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            {isCast ? "Add Actor" : "Invite Person"}
          </DialogTitle>
          <DialogDescription>
            {isCast
              ? "Add a cast member. Email is optional — add it to send a join invite."
              : "Invite someone to the project. They'll get an email join link if email is set up."}
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
            {saving ? "Saving…" : isCast ? "Add Actor" : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
