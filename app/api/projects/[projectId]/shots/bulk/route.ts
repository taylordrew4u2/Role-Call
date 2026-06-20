import { db } from "@/lib/db";
import { shots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";

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
  const access = await requireProjectOwner(projectId);
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
