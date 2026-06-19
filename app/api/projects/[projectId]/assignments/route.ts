import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, assignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/assignments
export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);

  const rows = await db
    .select()
    .from(assignments)
    .where(eq(assignments.projectId, id));

  return Response.json(rows);
}

// POST /api/projects/[projectId]/assignments — upsert an assignment
export async function POST(
  request: Request,
  { params }: { params: Params }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  // Only the project owner can assign
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { roleId, assignedMemberId, backupMemberId, notes } =
    await request.json();
  if (!roleId) {
    return Response.json({ error: "roleId is required" }, { status: 400 });
  }

  // Upsert: delete existing then insert
  const existing = await db
    .select()
    .from(assignments)
    .where(
      and(eq(assignments.projectId, id), eq(assignments.roleId, roleId))
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(assignments)
      .set({
        assignedMemberId: assignedMemberId ?? null,
        backupMemberId: backupMemberId ?? null,
        notes: notes ?? null,
      })
      .where(
        and(eq(assignments.projectId, id), eq(assignments.roleId, roleId))
      )
      .returning();
    return Response.json(updated);
  }

  const [created] = await db
    .insert(assignments)
    .values({
      projectId: id,
      roleId,
      assignedMemberId: assignedMemberId ?? null,
      backupMemberId: backupMemberId ?? null,
      notes: notes ?? null,
    })
    .returning();

  return Response.json(created, { status: 201 });
}
