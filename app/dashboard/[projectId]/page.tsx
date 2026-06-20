import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, projectMembers, assignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProjectRoles } from "@/lib/db/project-roles";
import { RoleAssignmentBoard } from "@/components/RoleAssignmentBoard";
import { CheckCircle2 } from "lucide-react";
import { getProductionType } from "@/lib/production-types";

type Params = Promise<{ projectId: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  // Load all data in parallel
  const [members, projectAssignments, allRoles] = await Promise.all([
    db.select().from(projectMembers).where(eq(projectMembers.projectId, id)),
    db.select().from(assignments).where(eq(assignments.projectId, id)),
    getProjectRoles(id),
  ]);

  // Progress stats
  const assignedCount = projectAssignments.filter(
    (a) => a.assignedMemberId !== null
  ).length;
  const totalRoles = allRoles.length;
  const criticalUnassigned = allRoles.filter((r) => {
    if (!r.isCritical) return false;
    const a = projectAssignments.find(
      (a) => a.roleId === r.id && a.assignedMemberId !== null
    );
    return !a;
  }).length;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
      {/* Progress summary */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {assignedCount}/{totalRoles} roles assigned
          </span>
          {criticalUnassigned > 0 && (
            <span className="text-red-600 font-medium">
              ⚠ {criticalUnassigned} critical role
              {criticalUnassigned !== 1 ? "s" : ""} unassigned
            </span>
          )}
        </div>
        <div className="mt-3 max-w-sm">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${totalRoles > 0 ? Math.round((assignedCount / totalRoles) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {totalRoles > 0 ? Math.round((assignedCount / totalRoles) * 100) : 0}%
            complete
          </p>
        </div>
      </div>

      <RoleAssignmentBoard
        projectId={id}
        ownerId={project.ownerId}
        currentUserId={userId}
        roles={allRoles.map((r) => ({
          ...r,
          duties: (r.duties as string[]) ?? [],
        }))}
        members={members}
        assignments={projectAssignments}
        recommendedRoleNames={
          getProductionType(project.projectType)?.recommendedRoles
        }
        productionTypeLabel={getProductionType(project.projectType)?.label}
      />
    </main>
  );
}
