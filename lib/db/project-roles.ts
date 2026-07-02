import { eq, isNull, or } from "drizzle-orm";
import { db } from "./index";
import { roles, projectHiddenRoles } from "./schema";
import type { Role } from "./schema";

/**
 * The roles shown for a project: the project's own custom roles, plus the
 * global template roles (project_id IS NULL) — but only once the project has
 * opted into the template via "Load template" — minus any the project has
 * hidden.
 */
export async function getProjectRoles(
  projectId: number,
  includeGlobalTemplate: boolean
): Promise<Role[]> {
  const [all, hidden] = await Promise.all([
    db
      .select()
      .from(roles)
      .where(
        includeGlobalTemplate
          ? or(isNull(roles.projectId), eq(roles.projectId, projectId))
          : eq(roles.projectId, projectId)
      ),
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
