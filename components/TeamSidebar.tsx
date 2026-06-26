"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Users, Link as LinkIcon, Trash2 } from "lucide-react";
import { toast } from "@/components/Toaster";

interface Member {
  id: number;
  displayName: string;
  email: string | null;
  status: string;
  roleCount: number;
  position?: string | null;
}

interface TeamSidebarProps {
  members: Member[];
  projectId: number;
  onInvite: () => void;
}

export function TeamSidebar({ members, projectId, onInvite }: TeamSidebarProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function copyInviteLink(member: Member) {
    const link = `${window.location.origin}/api/invite?projectId=${projectId}&memberId=${member.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast(`Invite link copied — send it to ${member.displayName}.`);
    } catch {
      prompt("Copy this invite link:", link);
    }
  }

  async function removeMember(member: Member) {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members?memberId=${member.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        toast(`Failed to remove ${member.displayName}: ${data.error}`);
      } else {
        toast(`${member.displayName} removed.`);
        setConfirmDelete(null);
        router.refresh();
      }
    } catch {
      toast("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Users className="h-4 w-4" />
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
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                    {m.displayName}
                    {m.position && (
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                          m.position === "writer"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {m.position}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{m.email ?? "No email"}</p>
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
                      <span className="text-[10px] text-amber-600 font-medium">
                        invited
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => copyInviteLink(m)}
                    title="Copy invite link"
                    className="text-slate-400 hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(m.id)}
                    title="Remove member"
                    className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Remove member?
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              {members.find((m) => m.id === confirmDelete)?.displayName} will be
              removed from this project. They can be re-invited later.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const member = members.find((m) => m.id === confirmDelete);
                  if (member) removeMember(member);
                }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
              >
                {deleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
