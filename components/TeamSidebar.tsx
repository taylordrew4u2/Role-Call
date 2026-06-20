"use client";

import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface Member {
  id: number;
  displayName: string;
  email: string | null;
  status: string;
  roleCount: number;
}

interface TeamSidebarProps {
  members: Member[];
  onInvite: () => void;
}

export function TeamSidebar({ members, onInvite }: TeamSidebarProps) {
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
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {m.displayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{m.email ?? "No email"}</p>
                </div>
                <div className="ml-2 flex flex-col items-end gap-1 shrink-0">
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
