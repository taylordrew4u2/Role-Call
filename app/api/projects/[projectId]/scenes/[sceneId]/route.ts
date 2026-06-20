import { db } from "@/lib/db";
import { scenes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string; sceneId: string }>;

const FIELDS = [
  "sceneNumber",
  "heading",
  "intExt",
  "location",
  "timeOfDay",
  "synopsis",
  "sortOrder",
] as const;

// PATCH /api/projects/[projectId]/scenes/[sceneId]
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { projectId, sceneId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const sid = parseInt(sceneId, 10);
  if (isNaN(sid)) return Response.json({ error: "Invalid scene ID" }, { status: 400 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (f in body) updates[f] = body[f];
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(scenes)
    .set(updates)
    .where(and(eq(scenes.id, sid), eq(scenes.projectId, access.id)))
    .returning();
  if (!updated) return Response.json({ error: "Scene not found" }, { status: 404 });
  return Response.json(updated);
}

// DELETE /api/projects/[projectId]/scenes/[sceneId]
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { projectId, sceneId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const sid = parseInt(sceneId, 10);
  if (isNaN(sid)) return Response.json({ error: "Invalid scene ID" }, { status: 400 });

  await db
    .delete(scenes)
    .where(and(eq(scenes.id, sid), eq(scenes.projectId, access.id)));
  return Response.json({ ok: true });
}
