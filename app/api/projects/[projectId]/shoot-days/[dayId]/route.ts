import { db } from "@/lib/db";
import { shootDays } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string; dayId: string }>;

const FIELDS = [
  "dayNumber",
  "shootDate",
  "location",
  "callTime",
  "notes",
  "sortOrder",
] as const;

// PATCH /api/projects/[projectId]/shoot-days/[dayId]
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { projectId, dayId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const id = parseInt(dayId, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid day ID" }, { status: 400 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (f in body) updates[f] = body[f];
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(shootDays)
    .set(updates)
    .where(and(eq(shootDays.id, id), eq(shootDays.projectId, access.id)))
    .returning();
  if (!updated) return Response.json({ error: "Shoot day not found" }, { status: 404 });
  return Response.json(updated);
}

// DELETE /api/projects/[projectId]/shoot-days/[dayId]
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { projectId, dayId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const id = parseInt(dayId, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid day ID" }, { status: 400 });

  await db
    .delete(shootDays)
    .where(and(eq(shootDays.id, id), eq(shootDays.projectId, access.id)));
  return Response.json({ ok: true });
}
