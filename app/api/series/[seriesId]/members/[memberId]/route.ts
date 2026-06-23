import { db } from "@/lib/db";
import { seriesMembers, projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireSeriesOwner } from "@/lib/series-access";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";

type Params = Promise<{ seriesId: string; memberId: string }>;

// DELETE /api/series/[seriesId]/members/[memberId] — remove a member from the
// series and from every project they were fanned out into. Owner only.
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { seriesId, memberId } = await params;
  await ensureSeriesSchema();
  const access = await requireSeriesOwner(seriesId);
  if (!access.ok) return access.response;

  const mid = parseInt(memberId, 10);
  if (isNaN(mid)) return Response.json({ error: "Invalid member ID" }, { status: 400 });

  // Remove the fanned-out project memberships first, then the series member.
  await db.delete(projectMembers).where(eq(projectMembers.seriesMemberId, mid));
  await db
    .delete(seriesMembers)
    .where(and(eq(seriesMembers.id, mid), eq(seriesMembers.seriesId, access.id)));

  return Response.json({ success: true });
}
