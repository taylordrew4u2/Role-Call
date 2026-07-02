import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, projectMembers, assignments } from "@/lib/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { getProjectRoles } from "@/lib/db/project-roles";
import { ensureRolesTemplateSchema } from "@/lib/db/ensure-roles-template-schema";
import { RoleAssignmentBoard } from "@/components/RoleAssignmentBoard";
import { CastBoard } from "@/components/CastBoard";
import { Clapperboard } from "lucide-react";
import { getProductionType } from "@/lib/production-types";
import { isProjectAdmin, isProjectEditor } from "@/lib/project-access";
import { Users2 } from "lucide-react";

type Params = Promise<{ projectId: string }>;

export default async function ProjectPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  await ensureRolesTemplateSchema();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const isAdmin = await isProjectAdmin(project, userId);
  const canEdit = await isProjectEditor(project, userId);

  // Ensure the owner has a crew projectMembers row so they can be assigned to roles.
  // We specifically look for a crew row (not cast) — the owner may also have a cast
  // row if they're acting, but they need a separate crew row to appear in assignments.
  const [existingOwnerMember] = await db
    .select({ id: projectMembers.id, clerkUserId: projectMembers.clerkUserId })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, id),
        eq(projectMembers.clerkUserId, userId),
        eq(projectMembers.kind, "crew")
      )
    );
  if (!existingOwnerMember) {
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
    const displayName =
      clerkUser?.fullName ||
      clerkUser?.username ||
      email ||
      "Owner";

    // If a manually-added crew row exists for this email, claim it rather than
    // creating a duplicate.
    if (email) {
      const [emailMatch] = await db
        .select({ id: projectMembers.id })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, id),
            eq(projectMembers.email, email),
            or(isNull(projectMembers.clerkUserId), eq(projectMembers.clerkUserId, ""))
          )
        );
      if (emailMatch) {
        await db
          .update(projectMembers)
          .set({ clerkUserId: userId, status: "active", positions: ["owner"], position: "owner" })
          .where(eq(projectMembers.id, emailMatch.id));
      } else {
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
    } else {
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
  }

  // Load all data in parallel
  const [members, projectAssignments, allRoles] = await Promise.all([
    db.select().from(projectMembers).where(eq(projectMembers.projectId, id)),
    db.select().from(assignments).where(eq(assignments.projectId, id)),
    getProjectRoles(id, project.rolesTemplateLoaded),
  ]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-10">
      {/* Team */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users2 className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Team</h2>
        </div>
        <CastBoard
          projectId={id}
          isOwner={isAdmin}
          isAdmin={isAdmin}
          initialMembers={members}
        />
      </section>

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
          rolesTemplateLoaded={project.rolesTemplateLoaded}
          roles={allRoles.map((r) => ({
            ...r,
            duties: (r.duties as string[]) ?? [],
          }))}
          members={members.filter((m) => m.kind !== "cast")}
          assignments={projectAssignments}
          recommendedRoleNames={getProductionType(project.projectType)?.recommendedRoles}
          productionTypeLabel={getProductionType(project.projectType)?.label}
        />
      </section>
    </main>
  );
}
