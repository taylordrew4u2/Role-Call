import { db } from "@/lib/db";
import { roles, assignments, projectHiddenRoles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string; roleId: string }>;

// DELETE /api/projects/[projectId]/roles/[roleId]
// Custom role → deleted outright. Global template → hidden for this project only.
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { projectId, roleId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const rid = parseInt(roleId, 10);
  if (isNaN(rid)) return Response.json({ error: "Invalid role ID" }, { status: 400 });

  const [role] = await db.select().from(roles).where(eq(roles.id, rid));
  if (!role) return Response.json({ error: "Role not found" }, { status: 404 });

  // Drop this project's assignment for the role either way.
  await db
    .delete(assignments)
    .where(and(eq(assignments.projectId, access.id), eq(assignments.roleId, rid)));

  if (role.projectId === access.id) {
    // Custom role belonging to this project — remove it entirely.
    await db.delete(roles).where(eq(roles.id, rid));
  } else if (role.projectId === null) {
    // Global template — hide it for this project (idempotent).
    const [already] = await db
      .select()
      .from(projectHiddenRoles)
      .where(
        and(
          eq(projectHiddenRoles.projectId, access.id),
          eq(projectHiddenRoles.roleId, rid)
        )
      );
    if (!already) {
      await db
        .insert(projectHiddenRoles)
        .values({ projectId: access.id, roleId: rid });
    }
  } else {
    // Belongs to a different project — not allowed.
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ ok: true });
}
