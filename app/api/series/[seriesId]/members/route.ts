import { db } from "@/lib/db";
import { seriesMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAppUrl } from "@/lib/get-app-url";
import {
  getSeriesAccess,
  requireSeriesOwner,
  fanOutMemberToProjects,
  projectIdsInSeries,
} from "@/lib/series-access";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";

type Params = Promise<{ seriesId: string }>;

// GET /api/series/[seriesId]/members
export async function GET(_request: Request, { params }: { params: Params }) {
  const { seriesId } = await params;
  await ensureSeriesSchema();
  const access = await getSeriesAccess(seriesId);
  if (!access.ok) return access.response;

  const rows = await db
    .select()
    .from(seriesMembers)
    .where(eq(seriesMembers.seriesId, access.id));
  return Response.json(rows);
}

// POST /api/series/[seriesId]/members — invite someone to the whole series.
// Owner only. The new member is fanned out into every project in the series.
export async function POST(request: Request, { params }: { params: Params }) {
  const { seriesId } = await params;
  await ensureSeriesSchema();
  const access = await requireSeriesOwner(seriesId);
  if (!access.ok) return access.response;

  const { displayName, email, kind, position } = await request.json();
  if (!displayName?.trim()) {
    return Response.json({ error: "A name is required" }, { status: 400 });
  }

  // A member is invited as a writer or a director (or neither for plain cast/crew).
  const normalizedPosition =
    position === "writer" ? "writer" : position === "director" ? "director" : null;

  const [member] = await db
    .insert(seriesMembers)
    .values({
      seriesId: access.id,
      email: email?.trim() || null,
      displayName: displayName.trim(),
      kind: kind === "cast" ? "cast" : "crew",
      position: normalizedPosition,
      status: "invited",
    })
    .returning();

  // Add them to every existing project in the series.
  const projectIds = await projectIdsInSeries(access.id);
  await fanOutMemberToProjects(member, projectIds);

  const inviteUrl = new URL(
    `/api/series-invite?seriesId=${access.id}&memberId=${member.id}`,
    getAppUrl(request)
  ).toString();

  return Response.json({ ...member, inviteUrl }, { status: 201 });
}
