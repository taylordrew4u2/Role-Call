import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProjectRoles } from "@/lib/db/project-roles";
import { requireProjectManager } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/roles-template — opt this project into the
// global role template (Director, DP, Gaffer, ...). Explicit user action only.
export async function POST(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;
  const { id } = access;

  await db
    .update(projects)
    .set({ rolesTemplateLoaded: true })
    .where(eq(projects.id, id));

  const roles = await getProjectRoles(id, true);
  return Response.json(roles);
}
