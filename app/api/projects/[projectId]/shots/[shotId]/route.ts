import { db } from "@/lib/db";
import { shots } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireProjectDirector } from "@/lib/project-access";

type Params = Promise<{ projectId: string; shotId: string }>;

const FIELDS = [
  "sceneId",
  "shootDayId",
  "shotNumber",
  "description",
  "shotSize",
  "angle",
  "movement",
  "lens",
  "equipment",
  "castNotes",
  "status",
  "notes",
  "sortOrder",
] as const;

// PATCH /api/projects/[projectId]/shots/[shotId]
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { projectId, shotId } = await params;
  const access = await requireProjectDirector(projectId);
  if (!access.ok) return access.response;

  const id = parseInt(shotId, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid shot ID" }, { status: 400 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (f in body) updates[f] = body[f];
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(shots)
    .set(updates)
    .where(and(eq(shots.id, id), eq(shots.projectId, access.id)))
    .returning();
  if (!updated) return Response.json({ error: "Shot not found" }, { status: 404 });
  return Response.json(updated);
}

// DELETE /api/projects/[projectId]/shots/[shotId]
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { projectId, shotId } = await params;
  const access = await requireProjectDirector(projectId);
  if (!access.ok) return access.response;

  const id = parseInt(shotId, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid shot ID" }, { status: 400 });

  await db.delete(shots).where(and(eq(shots.id, id), eq(shots.projectId, access.id)));
  return Response.json({ ok: true });
}
