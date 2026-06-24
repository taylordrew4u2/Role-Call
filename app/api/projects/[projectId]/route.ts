import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, projectMembers, assignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectManager } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId] — project detail with members + assignments
export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));

  const projectAssignments = await db
    .select()
    .from(assignments)
    .where(eq(assignments.projectId, id));

  return Response.json({ project, members, assignments: projectAssignments });
}

// PATCH /api/projects/[projectId] — update project
export async function PATCH(
  request: Request,
  { params }: { params: Params }
) {
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;
  const { id, project } = access;

  const body = await request.json();
  const [updated] = await db
    .update(projects)
    .set({
      title: body.title?.trim() ? body.title.trim() : project.title,
      projectType:
        body.projectType !== undefined ? body.projectType : project.projectType,
      shootDate: body.shootDate !== undefined ? body.shootDate : project.shootDate,
      description:
        body.description !== undefined ? body.description : project.description,
      cameraSetup:
        body.cameraSetup === "single" || body.cameraSetup === "dual"
          ? body.cameraSetup
          : project.cameraSetup,
    })
    .where(eq(projects.id, id))
    .returning();

  return Response.json(updated);
}

// DELETE /api/projects/[projectId]
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;

  await db.delete(projects).where(eq(projects.id, access.id));
  return new Response(null, { status: 204 });
}
