import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { getProjectRoles } from "@/lib/db/project-roles";
import { getProjectAccess, requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/roles — effective roles for this project
export async function GET(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await getProjectAccess(projectId);
  if (!access.ok) return access.response;
  return Response.json(
    await getProjectRoles(access.id, access.project.rolesTemplateLoaded)
  );
}

// POST /api/projects/[projectId]/roles — add a custom role to this project
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const body = await request.json();
  if (!body.name?.trim()) {
    return Response.json({ error: "Role name is required" }, { status: 400 });
  }

  const current = await getProjectRoles(access.id, access.project.rolesTemplateLoaded);
  const sortOrder = current.length
    ? Math.max(...current.map((r) => r.sortOrder)) + 1
    : 0;

  const [created] = await db
    .insert(roles)
    .values({
      projectId: access.id,
      name: body.name.trim(),
      category: body.category?.trim() || "Custom",
      isCritical: !!body.isCritical,
      duties: Array.isArray(body.duties) ? body.duties : [],
      sortOrder,
    })
    .returning();

  return Response.json(created, { status: 201 });
}
