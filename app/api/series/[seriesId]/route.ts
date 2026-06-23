import { db } from "@/lib/db";
import { series, seriesMembers, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSeriesAccess, requireSeriesOwner } from "@/lib/series-access";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";

type Params = Promise<{ seriesId: string }>;

// GET /api/series/[seriesId] — series with its projects and members
export async function GET(_request: Request, { params }: { params: Params }) {
  const { seriesId } = await params;
  await ensureSeriesSchema();
  const access = await getSeriesAccess(seriesId);
  if (!access.ok) return access.response;

  const [projectList, memberList] = await Promise.all([
    db.select().from(projects).where(eq(projects.seriesId, access.id)),
    db.select().from(seriesMembers).where(eq(seriesMembers.seriesId, access.id)),
  ]);

  return Response.json({
    series: access.series,
    isOwner: access.isOwner,
    projects: projectList,
    members: memberList,
  });
}

// PATCH /api/series/[seriesId] — rename / edit (owner only)
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { seriesId } = await params;
  await ensureSeriesSchema();
  const access = await requireSeriesOwner(seriesId);
  if (!access.ok) return access.response;

  const { title, description } = await request.json();
  const [updated] = await db
    .update(series)
    .set({
      title: title?.trim() || access.series.title,
      description: description?.trim() ?? access.series.description,
    })
    .where(eq(series.id, access.id))
    .returning();

  return Response.json(updated);
}

// DELETE /api/series/[seriesId] — delete a series (owner only).
// Projects are detached (series_id set null), not deleted.
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { seriesId } = await params;
  await ensureSeriesSchema();
  const access = await requireSeriesOwner(seriesId);
  if (!access.ok) return access.response;

  await db.delete(series).where(eq(series.id, access.id));
  return Response.json({ success: true });
}
