import { db } from "@/lib/db";
import { shootDays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProjectAccess, requireProjectDirector } from "@/lib/project-access";
import { ensureCallSheetSchema } from "@/lib/db/ensure-call-sheet-schema";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/shoot-days
export async function GET(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  await ensureCallSheetSchema();
  const access = await getProjectAccess(projectId);
  if (!access.ok) return access.response;

  const rows = await db
    .select()
    .from(shootDays)
    .where(eq(shootDays.projectId, access.id))
    .orderBy(shootDays.sortOrder);
  return Response.json(rows);
}

// POST /api/projects/[projectId]/shoot-days — create a shoot day
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectDirector(projectId);
  if (!access.ok) return access.response;

  const body = await request.json();

  const existing = await db
    .select()
    .from(shootDays)
    .where(eq(shootDays.projectId, access.id));

  await ensureCallSheetSchema();
  const [created] = await db
    .insert(shootDays)
    .values({
      projectId: access.id,
      dayNumber: body.dayNumber ?? existing.length + 1,
      shootDate: body.shootDate ?? null,
      location: body.location ?? null,
      locationAddress: body.locationAddress ?? null,
      locationNotes: body.locationNotes ?? null,
      callTime: body.callTime ?? null,
      wrapTime: body.wrapTime ?? null,
      lunchTime: body.lunchTime ?? null,
      notes: body.notes ?? null,
      sortOrder: existing.length,
    })
    .returning();
  return Response.json(created, { status: 201 });
}
