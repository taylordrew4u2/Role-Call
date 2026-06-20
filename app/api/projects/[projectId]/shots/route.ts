import { db } from "@/lib/db";
import { shots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProjectAccess, requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/shots
export async function GET(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await getProjectAccess(projectId);
  if (!access.ok) return access.response;

  const rows = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, access.id))
    .orderBy(shots.sortOrder);
  return Response.json(rows);
}

// POST /api/projects/[projectId]/shots — create a shot
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const body = await request.json();

  const existing = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, access.id));
  const sortOrder = existing.length;

  const [created] = await db
    .insert(shots)
    .values({
      projectId: access.id,
      sceneId: body.sceneId ?? null,
      shootDayId: body.shootDayId ?? null,
      shotNumber: body.shotNumber ?? "",
      description: body.description ?? "",
      shotSize: body.shotSize ?? null,
      angle: body.angle ?? null,
      movement: body.movement ?? null,
      lens: body.lens ?? null,
      equipment: body.equipment ?? null,
      castNotes: body.castNotes ?? null,
      status: body.status ?? "planned",
      notes: body.notes ?? null,
      sortOrder,
    })
    .returning();
  return Response.json(created, { status: 201 });
}
