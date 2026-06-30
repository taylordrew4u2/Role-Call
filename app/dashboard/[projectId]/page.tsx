import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, projectMembers, assignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getProjectRoles } from "@/lib/db/project-roles";
import { RoleAssignmentBoard } from "@/components/RoleAssignmentBoard";
import { CastBoard } from "@/components/CastBoard";
import { Clapperboard } from "lucide-react";
import { getProductionType } from "@/lib/production-types";
import { isProjectAdmin, isProjectEditor } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const isAdmin = await isProjectAdmin(project, userId);
  const canEdit = await isProjectEditor(project, userId);

  // Ensure the owner has a projectMembers row so they can be assigned to roles.
  // Check first to avoid a redundant write on every page load.
  const [existingOwnerMember] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, id),
        eq(projectMembers.clerkUserId, userId)
      )
    );
  if (!existingOwnerMember) {
    const clerkUser = await currentUser();
    const displayName =
      clerkUser?.fullName ||
      clerkUser?.username ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      "Owner";
    await db.insert(projectMembers).values({
      projectId: id,
      clerkUserId: userId,
      displayName,
      kind: "crew",
      positions: ["owner"],
      position: "owner",
      status: "active",
    });
  }

  // Load all data in parallel
  const [members, projectAssignments, allRoles] = await Promise.all([
    db.select().from(projectMembers).where(eq(projectMembers.projectId, id)),
    db.select().from(assignments).where(eq(assignments.projectId, id)),
    getProjectRoles(id),
  ]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-10">
      {/* Team members + permissions */}
      <CastBoard
        projectId={id}
        isOwner={isAdmin}
        isAdmin={isAdmin}
        initialMembers={members}
      />

      {/* Role assignments */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clapperboard className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Role Assignments</h2>
        </div>

        <RoleAssignmentBoard
          projectId={id}
          ownerId={project.ownerId}
          currentUserId={userId}
          canManage={canEdit}
          roles={allRoles.map((r) => ({
            ...r,
            duties: (r.duties as string[]) ?? [],
          }))}
          members={members}
          assignments={projectAssignments}
          recommendedRoleNames={getProductionType(project.projectType)?.recommendedRoles}
          productionTypeLabel={getProductionType(project.projectType)?.label}
        />
      </section>
    </main>
  );
}
