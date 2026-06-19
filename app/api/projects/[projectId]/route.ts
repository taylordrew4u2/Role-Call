import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, projectMembers, assignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = Promise<{ projectId: string }>;

async function getProjectAndVerifyOwner(projectId: number, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));
  if (!project) return null;
  if (project.ownerId !== userId) return null;
  return project;
}

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
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  const project = await getProjectAndVerifyOwner(id, userId);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const { title, shootDate, description } = await request.json();
  const [updated] = await db
    .update(projects)
    .set({
      title: title ?? project.title,
      shootDate: shootDate ?? project.shootDate,
      description: description ?? project.description,
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
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  const project = await getProjectAndVerifyOwner(id, userId);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  await db.delete(projects).where(eq(projects.id, id));
  return new Response(null, { status: 204 });
}
