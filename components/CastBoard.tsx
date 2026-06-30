"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Drama,
  Users2,
  Plus,
  Trash2,
  Link as LinkIcon,
  Pencil,
  Sparkles,
  Loader2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectMember } from "@/lib/db/schema";
import { toast } from "@/components/Toaster";
import { memberEffectivePositions, type CrewPosition } from "@/lib/member-positions";

const CREW_POSITIONS = ["owner", "director", "writer"] as const;

const POSITION_DESCRIPTIONS: Record<CrewPosition, string> = {
  owner: "Manage members & settings",
  director: "Suggest script edits & manage the project",
  writer: "Edit script & approve suggestions",
};

// ─── MemberRow ────────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: ProjectMember;
  projectId: number;
  isOwner: boolean;
  isAdmin: boolean;
  showPositions?: boolean;
  onMemberUpdated: (updated: ProjectMember) => void;
  onRemove: (member: ProjectMember) => void;
  onEdit: (member: ProjectMember) => void;
  onCopyLink: (member: ProjectMember) => void;
}

function MemberRow({
  member,
  projectId,
  isOwner,
  isAdmin,
  showPositions,
  onMemberUpdated,
  onRemove,
  onEdit,
  onCopyLink,
}: MemberRowProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const unassigned = member.kind === "cast" && !member.displayName.trim();
  const positions = memberEffectivePositions(member);

  async function togglePosition(pos: CrewPosition) {
    if (saving) return;
    const next = positions.includes(pos)
      ? positions.filter((p) => p !== pos)
      : [...positions, pos];
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: next }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || "Couldn't update permissions.");
        return;
      }
      const updated: ProjectMember = await res.json();
      onMemberUpdated(updated);
      router.refresh();
    } catch {
      toast("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-slate-100 last:border-0">
      {/* Identity */}
      <div className="min-w-0 flex-1">
        {unassigned ? (
          <p className="text-sm font-medium text-slate-900 truncate">
            {member.character || "Unnamed role"}
            <span className="text-slate-400 font-normal"> — not cast yet</span>
          </p>
        ) : (
          <p className="text-sm font-medium text-slate-900 truncate">
            {member.displayName}
            {member.character && (
              <span className="text-slate-400 font-normal"> as {member.character}</span>
            )}
          </p>
        )}
        {member.email && (
          <p className="text-xs text-slate-400 truncate">{member.email}</p>
        )}

        {/* Permission pills — shown below name on mobile */}
        {showPositions && (
          <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
            {CREW_POSITIONS.map((pos) => {
              const active = positions.includes(pos);
              return isAdmin ? (
                <button
                  key={pos}
                  title={POSITION_DESCRIPTIONS[pos]}
                  disabled={saving}
                  aria-pressed={active}
                  onClick={() => togglePosition(pos)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors disabled:opacity-50",
                    active
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-700"
                  )}
                >
                  {pos.charAt(0).toUpperCase() + pos.slice(1)}
                </button>
              ) : active ? (
                <span
                  key={pos}
                  className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 border border-red-200"
                >
                  {pos.charAt(0).toUpperCase() + pos.slice(1)}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* Permission pills — desktop, right of name */}
      {showPositions && (
        <div className="hidden sm:flex items-center gap-1 flex-wrap shrink-0 pt-0.5">
          {CREW_POSITIONS.map((pos) => {
            const active = positions.includes(pos);
            return isAdmin ? (
              <button
                key={pos}
                title={POSITION_DESCRIPTIONS[pos]}
                disabled={saving}
                aria-pressed={active}
                onClick={() => togglePosition(pos)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors disabled:opacity-50",
                  active
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-700"
                )}
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </button>
            ) : active ? (
              <span
                key={pos}
                className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200"
              >
                {pos.charAt(0).toUpperCase() + pos.slice(1)}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Status + actions */}
      <div className="flex items-center gap-1 shrink-0">
        {unassigned ? (
          isOwner ? (
            <Button size="sm" variant="outline" onClick={() => onEdit(member)}>
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Cast
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
            aria-label={`Copy invite link for ${member.displayName}`}
            onClick={() => onCopyLink(member)}
          >
            <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        {isOwner && !unassigned && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Edit ${member.displayName}`}
            onClick={() => onEdit(member)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
        {isOwner && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Remove ${member.displayName || member.character || "member"}`}
            onClick={() => onRemove(member)}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── CastBoard ────────────────────────────────────────────────────────────────

export function CastBoard({
  projectId,
  isOwner,
  isAdmin,
  initialMembers,
}: {
  projectId: number;
  isOwner: boolean;
  isAdmin: boolean;
  initialMembers: ProjectMember[];
}) {
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers);
  const [dialog, setDialog] = useState<{
    mode: "cast" | "crew";
    member: ProjectMember | null;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<ProjectMember | null>(null);
  const [removing, setRemoving] = useState(false);

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
      const skippedNote = data.skipped ? ` (${data.skipped} already in the cast)` : "";
      toast(
        `Added ${created.length} role${created.length !== 1 ? "s" : ""} from the script${skippedNote}. Add who's playing each one.`
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
    toast("Couldn't save. Please try again.", "error");
    return false;
  }

  async function removeMember(member: ProjectMember) {
    setRemoving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${member.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMembers((m) => m.filter((x) => x.id !== member.id));
        setConfirmRemove(null);
      } else {
        toast(`Couldn't remove ${member.displayName}. Please try again.`, "error");
      }
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setRemoving(false);
    }
  }

  async function copyInviteLink(member: ProjectMember) {
    const link = `${window.location.origin}/api/invite?projectId=${projectId}&memberId=${member.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast(`Invite link copied — send it to ${member.displayName}.`);
    } catch {
      toast(`Invite link for ${member.displayName}: ${link}`);
    }
  }

  const rowProps = {
    projectId,
    isOwner,
    isAdmin,
    onMemberUpdated: (updated: ProjectMember) =>
      setMembers((m) => m.map((x) => (x.id === updated.id ? updated : x))),
    onRemove: setConfirmRemove,
    onEdit: (member: ProjectMember) =>
      setDialog({ mode: member.kind === "cast" ? "cast" : "crew", member }),
    onCopyLink: copyInviteLink,
  };

  return (
    <>
      {/* Two-column layout: Cast (wider) + Collaborators (sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* ── Cast column ── */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Drama className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Cast
              <span className="font-normal text-slate-400">({cast.length})</span>
            </span>
            {isOwner && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={generateFromScript}
                  disabled={generating}
                  title="Import characters from your script"
                  className="text-slate-500 hover:text-slate-900"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline ml-1">Import from script</span>
                </Button>
                <Button size="sm" onClick={() => setDialog({ mode: "cast", member: null })}>
                  <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Add actor
                </Button>
              </div>
            )}
          </div>

          {cast.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400">
              {isOwner
                ? "No actors yet — add them manually or import from your script."
                : "No actors added yet."}
            </p>
          ) : (
            cast.map((m) => <MemberRow key={m.id} member={m} {...rowProps} />)
          )}
        </div>

        {/* ── Collaborators column ── */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden self-start">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Users2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Collaborators
              <span className="font-normal text-slate-400">({crew.length})</span>
            </span>
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialog({ mode: "crew", member: null })}
              >
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Add
              </Button>
            )}
          </div>

          {crew.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400">
              {isOwner
                ? "No collaborators yet — invite people to work on this project."
                : "No collaborators added yet."}
            </p>
          ) : (
            crew.map((m) => <MemberRow key={m.id} member={m} showPositions {...rowProps} />)
          )}
        </div>
      </div>

      {dialog && (
        <PersonDialog
          mode={dialog.mode}
          member={dialog.member}
          onClose={() => setDialog(null)}
          onSave={saveMember}
        />
      )}

      <Dialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && !removing && setConfirmRemove(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              <strong>{confirmRemove?.displayName}</strong> will be removed from this project.
              They can be re-invited later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={removing}
              onClick={() => setConfirmRemove(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={removing}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => confirmRemove && removeMember(confirmRemove)}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── PersonDialog ─────────────────────────────────────────────────────────────

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
  const casting = isCast && member !== null && !member.displayName.trim();

  async function submit() {
    if (!displayName.trim()) {
      setError("A name is required.");
      return;
    }
    setError("");
    setSaving(true);
    const ok = await onSave(
      { displayName, character: isCast ? character : undefined, email, kind: mode },
      member
    );
    setSaving(false);
    if (!ok) setError("Something went wrong. Please try again.");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {casting
              ? `Cast ${member?.character || "this role"}`
              : isEdit
                ? "Edit"
                : isCast
                  ? "Add actor"
                  : "Add collaborator"}
          </DialogTitle>
          <DialogDescription>
            {casting
              ? "Who's playing this role? Email is optional."
              : isCast
                ? "Actor details. Email is optional."
                : "Share their invite link so they can join the project."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              placeholder={isCast ? "e.g. Alex Rivera" : "e.g. Jordan Smith"}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          {isCast && (
            <div className="space-y-1">
              <Label htmlFor="person-character">Character</Label>
              <Input
                id="person-character"
                placeholder="e.g. Detective Mara"
                value={character}
                onChange={(e) => setCharacter(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="person-email">Email {isCast ? "(optional)" : ""}</Label>
            <Input
              id="person-email"
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
                    ? "Add actor"
                    : "Add collaborator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
