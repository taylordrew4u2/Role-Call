import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Utility to merge Tailwind classes safely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string (YYYY-MM-DD) to a human-readable format. */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBD";
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Compute assignment progress stats for a project. */
export function getProgressStats(
  roles: { isCritical: boolean }[],
  assignments: { assignedMemberId: number | null }[]
) {
  const total = roles.length;
  const assigned = assignments.filter((a) => a.assignedMemberId !== null).length;
  const critical = roles.filter((r) => r.isCritical).length;
  const criticalAssigned = roles.filter((r) => {
    const a = assignments.find(
      (a) => a.assignedMemberId !== null
    );
    return r.isCritical && !!a;
  }).length;

  return {
    total,
    assigned,
    unassigned: total - assigned,
    critical,
    criticalAssigned,
    criticalUnassigned: critical - criticalAssigned,
    percent: total > 0 ? Math.round((assigned / total) * 100) : 0,
  };
}
