import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { series, seriesMembers, projects, projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { Series, SeriesMember } from "@/lib/db/schema";

type Ok = {
  ok: true;
  userId: string;
  id: number;
  series: Series;
  isOwner: boolean;
};
type Err = { ok: false; response: Response };

/** Resolve access to a series for the current user (owner or a joined member). */
export async function getSeriesAccess(seriesIdStr: string): Promise<Ok | Err> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const id = parseInt(seriesIdStr, 10);
  if (isNaN(id)) {
    return { ok: false, response: Response.json({ error: "Invalid series ID" }, { status: 400 }) };
  }
  const [row] = await db.select().from(series).where(eq(series.id, id));
  if (!row) {
    return { ok: false, response: Response.json({ error: "Series not found" }, { status: 404 }) };
  }

  const isOwner = row.ownerId === userId;
  if (!isOwner) {
    const [member] = await db
      .select()
      .from(seriesMembers)
      .where(and(eq(seriesMembers.seriesId, id), eq(seriesMembers.clerkUserId, userId)));
    if (!member) {
      return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  return { ok: true, userId, id, series: row, isOwner };
}

/** Like getSeriesAccess but requires the caller to be the series owner. */
export async function requireSeriesOwner(seriesIdStr: string): Promise<Ok | Err> {
  const access = await getSeriesAccess(seriesIdStr);
  if (!access.ok) return access;
  if (!access.isOwner) {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return access;
}

/**
 * Create project_members rows for one series member across the given projects,
 * skipping any project where that series member is already present.
 */
export async function fanOutMemberToProjects(
  member: SeriesMember,
  projectIds: number[]
): Promise<void> {
  for (const projectId of projectIds) {
    const [existing] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.seriesMemberId, member.id)
        )
      );
    if (existing) continue;
    await db.insert(projectMembers).values({
      projectId,
      seriesMemberId: member.id,
      clerkUserId: member.clerkUserId,
      email: member.email,
      displayName: member.displayName,
      kind: member.kind === "cast" ? "cast" : "crew",
      position: member.position,
      status: member.status,
    });
  }
}

/** Copy every member of a series into a newly-added project. */
export async function syncSeriesMembersIntoProject(
  seriesId: number,
  projectId: number
): Promise<void> {
  const members = await db
    .select()
    .from(seriesMembers)
    .where(eq(seriesMembers.seriesId, seriesId));
  for (const member of members) {
    await fanOutMemberToProjects(member, [projectId]);
  }
}

/** All project IDs that belong to a series. */
export async function projectIdsInSeries(seriesId: number): Promise<number[]> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.seriesId, seriesId));
  return rows.map((r) => r.id);
}
