import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projects, projectMembers, assignments, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserButton } from "@clerk/nextjs";
import { RoleAssignmentBoard } from "@/components/RoleAssignmentBoard";
import { Clapperboard, ArrowLeft, Calendar, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ projectId: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  // Load project
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) redirect("/dashboard");

  // Load all other data in parallel
  const [members, projectAssignments, allRoles] = await Promise.all([
    db.select().from(projectMembers).where(eq(projectMembers.projectId, id)),
    db.select().from(assignments).where(eq(assignments.projectId, id)),
    db.select().from(roles).orderBy(roles.sortOrder),
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-xl text-slate-900"
          >
            <Clapperboard className="h-6 w-6 text-red-600" />
            <span className="hidden sm:inline">RoleCall</span>
          </Link>
        </div>
        <UserButton />
      </header>

      {/* Project header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {project.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Shoot day: {formatDate(project.shootDate)}
            </span>
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
          {project.description && (
            <p className="mt-2 text-sm text-slate-500 max-w-2xl">
              {project.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-4 max-w-sm">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${totalRoles > 0 ? Math.round((assignedCount / totalRoles) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {totalRoles > 0
                ? Math.round((assignedCount / totalRoles) * 100)
                : 0}
              % complete
            </p>
          </div>
        </div>
      </div>

      {/* Assignment board */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
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
        />
      </main>
    </div>
  );
}
