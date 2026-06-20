import { db } from "@/lib/db";
import { scenes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProjectAccess, requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/scenes
export async function GET(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await getProjectAccess(projectId);
  if (!access.ok) return access.response;

  const rows = await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, access.id))
    .orderBy(scenes.sortOrder);
  return Response.json(rows);
}

// POST /api/projects/[projectId]/scenes — create a scene
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const body = await request.json();
  if (!body.heading?.trim()) {
    return Response.json({ error: "Scene heading is required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, access.id));
  const sortOrder = existing.length;

  const [created] = await db
    .insert(scenes)
    .values({
      projectId: access.id,
      sceneNumber: body.sceneNumber ?? "",
      heading: body.heading.trim(),
      intExt: body.intExt ?? null,
      location: body.location ?? null,
      timeOfDay: body.timeOfDay ?? null,
      synopsis: body.synopsis ?? null,
      sortOrder,
    })
    .returning();
  return Response.json(created, { status: 201 });
}
