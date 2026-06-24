import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { assignments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireProjectManager } from "@/lib/project-access";

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
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;
  const { id } = access;

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
