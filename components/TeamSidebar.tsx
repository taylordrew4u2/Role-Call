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
import { Badge } from "@/components/ui/badge";
import { Users, Link as LinkIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/Toaster";
import { memberEffectivePositions } from "@/lib/member-positions";

interface Member {
  id: number;
  displayName: string;
  email: string | null;
  status: string;
  roleCount: number;
  position?: string | null;
  positions?: string[] | null;
}

interface TeamSidebarProps {
  members: Member[];
  projectId: number;
  onInvite: () => void;
}

const POSITION_COLORS: Record<string, string> = {
  owner: "bg-amber-50 text-amber-700",
  writer: "bg-violet-50 text-violet-700",
  director: "bg-sky-50 text-sky-700",
};

export function TeamSidebar({ members, projectId, onInvite }: TeamSidebarProps) {
  const router = useRouter();
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  async function copyInviteLink(member: Member) {
    const link = `${window.location.origin}/api/invite?projectId=${projectId}&memberId=${member.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast(`Invite link copied — send it to ${member.displayName}.`);
    } catch {
      toast(`Invite link for ${member.displayName}: ${link}`);
    }
  }

  async function removeMember(member: Member) {
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members?memberId=${member.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || `Couldn't remove ${member.displayName}.`);
      } else {
        toast(`${member.displayName} removed.`);
        setConfirmRemove(null);
        router.refresh();
      }
    } catch {
      toast("Network error. Please try again.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Users className="h-4 w-4" aria-hidden="true" />
            Team ({members.length})
          </div>
          <button
            onClick={onInvite}
            className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md px-2 py-1 transition-colors font-medium"
          >
            + Invite
          </button>
        </div>

        {members.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-400">No members yet.</p>
            <button
              onClick={onInvite}
              className="mt-2 text-xs text-slate-600 underline hover:no-underline"
            >
              Invite someone
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((m) => {
              const positions = memberEffectivePositions(m);
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5 flex-wrap">
                      {m.displayName}
                      {positions.map((pos) => (
                        <span
                          key={pos}
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
                            POSITION_COLORS[pos] ?? "bg-slate-100 text-slate-600"
                          )}
                        >
                          {pos}
                        </span>
                      ))}
                    </p>
                    {m.email && (
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    )}
                  </div>
                  <div className="ml-2 flex items-center gap-1.5 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={m.roleCount > 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {m.roleCount} role{m.roleCount !== 1 ? "s" : ""}
                      </Badge>
                      {m.status === "invited" && (
                        <span className="text-[10px] text-amber-600 font-medium">invited</span>
                      )}
                    </div>
                    <button
                      onClick={() => copyInviteLink(m)}
                      aria-label={`Copy invite link for ${m.displayName}`}
                      className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setConfirmRemove(m)}
                      aria-label={`Remove ${m.displayName}`}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!confirmRemove} onOpenChange={(o) => !o && !removing && setConfirmRemove(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              <strong>{confirmRemove?.displayName}</strong> will be removed from this project. They can be re-invited later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" disabled={removing} onClick={() => setConfirmRemove(null)}>
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
    </aside>
  );
}
