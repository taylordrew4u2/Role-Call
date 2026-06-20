import { db } from "@/lib/db";
import { roles, assignments, projectHiddenRoles } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string; roleId: string }>;

// PATCH /api/projects/[projectId]/roles/[roleId]
// Editing a custom role updates it in place. Editing a global template creates
// a project-specific copy with the changes and hides the template for this
// project — so other projects are unaffected.
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { projectId, roleId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const rid = parseInt(roleId, 10);
  if (isNaN(rid)) return Response.json({ error: "Invalid role ID" }, { status: 400 });

  const [role] = await db.select().from(roles).where(eq(roles.id, rid));
  if (!role) return Response.json({ error: "Role not found" }, { status: 404 });

  const body = await request.json();
  const next = {
    name: body.name?.trim() ? body.name.trim() : role.name,
    category: body.category?.trim() ? body.category.trim() : role.category,
    isCritical:
      typeof body.isCritical === "boolean" ? body.isCritical : role.isCritical,
  };

  if (role.projectId === access.id) {
    const [updated] = await db
      .update(roles)
      .set(next)
      .where(eq(roles.id, rid))
      .returning();
    return Response.json(updated);
  }

  if (role.projectId === null) {
    // Create a project override and hide the template here.
    const [created] = await db
      .insert(roles)
      .values({
        projectId: access.id,
        name: next.name,
        category: next.category,
        isCritical: next.isCritical,
        duties: (role.duties as string[]) ?? [],
        sortOrder: role.sortOrder,
      })
      .returning();
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
    // Move this project's existing assignment to the new role row.
    await db
      .update(assignments)
      .set({ roleId: created.id })
      .where(and(eq(assignments.projectId, access.id), eq(assignments.roleId, rid)));
    return Response.json({ ...created, replacedRoleId: rid });
  }

  return Response.json({ error: "Forbidden" }, { status: 403 });
}

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
