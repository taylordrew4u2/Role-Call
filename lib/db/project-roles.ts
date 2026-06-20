import { eq, isNull, or } from "drizzle-orm";
import { db } from "./index";
import { roles, projectHiddenRoles } from "./schema";
import type { Role } from "./schema";

/**
 * The roles shown for a project: global template roles (project_id IS NULL)
 * plus the project's own custom roles, minus any the project has hidden.
 */
export async function getProjectRoles(projectId: number): Promise<Role[]> {
  const [all, hidden] = await Promise.all([
    db
      .select()
      .from(roles)
      .where(or(isNull(roles.projectId), eq(roles.projectId, projectId))),
    db
      .select()
      .from(projectHiddenRoles)
      .where(eq(projectHiddenRoles.projectId, projectId)),
  ]);

  const hiddenIds = new Set(hidden.map((h) => h.roleId));
  return all
    .filter((r) => !hiddenIds.has(r.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** True if the role is a global template (shared, not owned by a project). */
export function isGlobalRole(role: { projectId: number | null }) {
  return role.projectId === null;
}
