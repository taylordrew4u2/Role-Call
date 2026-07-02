import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, projectMembers, assignments, scenes, shots, shootDays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProjectRoles } from "@/lib/db/project-roles";
import { ensureRolesTemplateSchema } from "@/lib/db/ensure-roles-template-schema";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

type Params = Promise<{ projectId: string }>;

interface Check {
  level: "ok" | "warn" | "info";
  title: string;
  detail?: string;
}

export default async function ChecksPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  await ensureRolesTemplateSchema();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const [roles, asg, members, sceneRows, shotRows, days] = await Promise.all([
    getProjectRoles(id, project.rolesTemplateLoaded),
    db.select().from(assignments).where(eq(assignments.projectId, id)),
    db.select().from(projectMembers).where(eq(projectMembers.projectId, id)),
    db.select().from(scenes).where(eq(scenes.projectId, id)),
    db.select().from(shots).where(eq(shots.projectId, id)),
    db.select().from(shootDays).where(eq(shootDays.projectId, id)),
  ]);

  const assignedRoleIds = new Set(
    asg.filter((a) => a.assignedMemberId !== null).map((a) => a.roleId)
  );

  const checks: Check[] = [];

  // Critical roles unfilled
  const criticalUnfilled = roles.filter((r) => r.isCritical && !assignedRoleIds.has(r.id));
  checks.push(
    criticalUnfilled.length === 0
      ? { level: "ok", title: "All critical roles are filled" }
      : {
          level: "warn",
          title: `${criticalUnfilled.length} critical role${criticalUnfilled.length !== 1 ? "s" : ""} unfilled`,
          detail: criticalUnfilled.map((r) => r.name).join(", "),
        }
  );

  // All roles assignment progress
  const unfilled = roles.filter((r) => !assignedRoleIds.has(r.id));
  if (unfilled.length > 0) {
    checks.push({
      level: "info",
      title: `${assignedRoleIds.size}/${roles.length} roles assigned`,
      detail: `${unfilled.length} still open`,
    });
  } else if (roles.length > 0) {
    checks.push({ level: "ok", title: "Every role is assigned" });
  }

  // Cast
  const cast = members.filter((m) => m.kind === "cast");
  checks.push(
    cast.length === 0
      ? { level: "info", title: "No cast added yet", detail: "Add actors on the Cast tab" }
      : { level: "ok", title: `${cast.length} cast member${cast.length !== 1 ? "s" : ""} added` }
  );

  // Scenes with no shots
  if (sceneRows.length === 0) {
    checks.push({ level: "info", title: "No scenes yet", detail: "Add scenes on the Shot List tab" });
  } else {
    const shotSceneIds = new Set(shotRows.map((s) => s.sceneId));
    const emptyScenes = sceneRows.filter((s) => !shotSceneIds.has(s.id));
    checks.push(
      emptyScenes.length === 0
        ? { level: "ok", title: "Every scene has at least one shot" }
        : {
            level: "warn",
            title: `${emptyScenes.length} scene${emptyScenes.length !== 1 ? "s" : ""} with no shots`,
            detail: emptyScenes.map((s) => `${s.sceneNumber ? s.sceneNumber + " " : ""}${s.heading}`).join("; "),
          }
    );
  }

  // Shots with no shoot day
  if (shotRows.length > 0) {
    const unscheduled = shotRows.filter((s) => s.shootDayId === null);
    checks.push(
      unscheduled.length === 0
        ? { level: "ok", title: "Every shot is scheduled to a day" }
        : {
            level: "warn",
            title: `${unscheduled.length} shot${unscheduled.length !== 1 ? "s" : ""} not on a shoot day`,
            detail: days.length === 0 ? "Add shoot days on the Schedule tab" : "Assign them on the Schedule tab",
          }
    );
  }

  // Call sheet completeness
  if (days.length > 0) {
    const missingCallTime = days.filter((d) => !d.callTime);
    const missingLocation = days.filter((d) => !d.location);
    if (missingCallTime.length > 0) {
      checks.push({
        level: "warn",
        title: `${missingCallTime.length} shoot day${missingCallTime.length !== 1 ? "s" : ""} missing a call time`,
        detail: "Add call times on the Schedule tab so your crew knows when to arrive",
      });
    } else {
      checks.push({ level: "ok", title: "All shoot days have a call time" });
    }
    if (missingLocation.length > 0) {
      checks.push({
        level: "info",
        title: `${missingLocation.length} shoot day${missingLocation.length !== 1 ? "s" : ""} missing a location`,
        detail: "Add locations on the Schedule tab",
      });
    }
  }

  const warnings = checks.filter((c) => c.level === "warn").length;

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-1">
        <ListChecksHeading />
      </div>
      <p className="text-sm text-slate-500 mb-5">
        {warnings === 0
          ? "Everything looks ready. No outstanding issues."
          : `${warnings} thing${warnings !== 1 ? "s" : ""} to look at before shoot day.`}
      </p>

      <div className="space-y-2">
        {checks.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            {c.level === "ok" && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
            {c.level === "warn" && <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            {c.level === "info" && <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{c.title}</p>
              {c.detail && <p className="text-xs text-slate-500 mt-0.5">{c.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function ListChecksHeading() {
  return <h2 className="text-lg font-semibold text-slate-900">Project checks</h2>;
}
