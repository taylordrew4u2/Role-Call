import { db } from "@/lib/db";
import { shots } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requireProjectDirector } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

interface IncomingShot {
  shotNumber?: string;
  description?: string;
  shotSize?: string;
  angle?: string;
  movement?: string;
  lens?: string;
  notes?: string;
}

// POST /api/projects/[projectId]/shots/bulk — create many shots at once
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectDirector(projectId);
  if (!access.ok) return access.response;

  const body = await request.json();
  const incoming: IncomingShot[] = Array.isArray(body.shots) ? body.shots : [];
  const sceneId: number | null = body.sceneId ?? null;
  if (incoming.length === 0) {
    return Response.json({ error: "No shots to add" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, access.id));
  let order = existing.length;

  const rows = incoming.map((s) => ({
    projectId: access.id,
    sceneId,
    shotNumber: s.shotNumber ?? "",
    description: s.description ?? "",
    shotSize: s.shotSize || null,
    angle: s.angle || null,
    movement: s.movement || null,
    lens: s.lens || null,
    notes: s.notes || null,
    status: "planned",
    sortOrder: order++,
  }));

  const created = await db.insert(shots).values(rows).returning();
  return Response.json(created, { status: 201 });
}

// DELETE /api/projects/[projectId]/shots/bulk — mass-delete shots.
// Body: { ids: number[] } to delete specific shots, or { all: true } to clear
// every shot in the project.
export async function DELETE(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectDirector(projectId);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));

  if (body?.all === true) {
    await db.delete(shots).where(eq(shots.projectId, access.id));
    return Response.json({ ok: true, scope: "all" });
  }

  const ids: number[] = Array.isArray(body?.ids)
    ? body.ids.filter((n: unknown) => Number.isInteger(n))
    : [];
  if (ids.length === 0) {
    return Response.json({ error: "No shot IDs provided" }, { status: 400 });
  }

  await db
    .delete(shots)
    .where(and(eq(shots.projectId, access.id), inArray(shots.id, ids)));
  return Response.json({ ok: true, deleted: ids.length });
}
