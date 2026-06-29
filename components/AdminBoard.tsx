"use client";

import { useState } from "react";
import { Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/Toaster";
import type { ProjectMember } from "@/lib/db/schema";

const CREW_POSITIONS = ["owner", "director", "writer"] as const;
type CrewPosition = (typeof CREW_POSITIONS)[number];

function memberPositions(member: ProjectMember): CrewPosition[] {
  const arr = (member.positions as string[] | null) ?? [];
  const valid = arr.filter((p): p is CrewPosition =>
    (CREW_POSITIONS as readonly string[]).includes(p)
  );
  if (valid.length) return valid;
  if (
    member.position &&
    (CREW_POSITIONS as readonly string[]).includes(member.position)
  )
    return [member.position as CrewPosition];
  return [];
}

function PositionBadge({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors",
        active
          ? "bg-red-600 text-white border-red-600"
          : "bg-white text-slate-500 border-slate-300 hover:border-slate-500 hover:text-slate-700"
      )}
    >
      {label}
    </button>
  );
}

function MemberRow({
  member,
  projectId,
  isProjectOwner,
}: {
  member: ProjectMember;
  projectId: number;
  isProjectOwner: boolean;
}) {
  const [positions, setPositions] = useState<CrewPosition[]>(
    memberPositions(member)
  );
  const [saving, setSaving] = useState(false);

  async function toggle(pos: CrewPosition) {
    const next = positions.includes(pos)
      ? positions.filter((p) => p !== pos)
      : [...positions, pos];
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions: next }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        toast(d.error || "Couldn't update positions.");
        return;
      }
      setPositions(next);
    } catch {
      toast("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3",
        saving && "opacity-60"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">
          {member.displayName}
        </p>
        {member.email && (
          <p className="truncate text-xs text-slate-400">{member.email}</p>
        )}
      </div>
      {isProjectOwner && (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {CREW_POSITIONS.map((pos) => (
            <PositionBadge
              key={pos}
              label={pos.charAt(0).toUpperCase() + pos.slice(1)}
              active={positions.includes(pos)}
              onClick={() => !saving && toggle(pos)}
            />
          ))}
        </div>
      )}
      {!isProjectOwner && positions.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {positions.map((pos) => (
            <span
              key={pos}
              className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200"
            >
              {pos.charAt(0).toUpperCase() + pos.slice(1)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminBoard({
  projectId,
  members,
  isProjectOwner,
}: {
  projectId: number;
  members: ProjectMember[];
  isProjectOwner: boolean;
}) {
  const crew = members.filter((m) => m.kind !== "cast");
  const cast = members.filter((m) => m.kind === "cast");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-900">Admin Board</h2>
      </div>

      {isProjectOwner && (
        <p className="text-sm text-slate-500">
          Toggle crew positions to control who can edit content (Writer),
          suggest edits (Director), or manage members (Owner). Cast members are
          always view-only.
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Crew
        </h3>
        {crew.length === 0 && (
          <p className="text-sm text-slate-400 italic">No crew members yet.</p>
        )}
        {crew.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            projectId={projectId}
            isProjectOwner={isProjectOwner}
          />
        ))}
      </section>

      {cast.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Cast (view-only)
          </h3>
          {cast.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {m.displayName}
                </p>
                {m.character && (
                  <p className="truncate text-xs text-slate-400">
                    as {m.character}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                Cast
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
