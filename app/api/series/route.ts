import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { series, seriesMembers } from "@/lib/db/schema";
import { eq, inArray, or } from "drizzle-orm";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";

// GET /api/series — list series the user owns or belongs to
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSeriesSchema();

  const memberOf = await db
    .select({ seriesId: seriesMembers.seriesId })
    .from(seriesMembers)
    .where(eq(seriesMembers.clerkUserId, userId));
  const memberSeriesIds = memberOf.map((m) => m.seriesId);

  const rows = await db
    .select()
    .from(series)
    .where(
      memberSeriesIds.length
        ? or(eq(series.ownerId, userId), inArray(series.id, memberSeriesIds))
        : eq(series.ownerId, userId)
    )
    .orderBy(series.createdAt);

  return Response.json(rows);
}

// POST /api/series — create a series
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSeriesSchema();

  const { title, description } = await request.json();
  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(series)
    .values({
      ownerId: userId,
      title: title.trim(),
      description: description?.trim() || null,
    })
    .returning();

  return Response.json(created, { status: 201 });
}
