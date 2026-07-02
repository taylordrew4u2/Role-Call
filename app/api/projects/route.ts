import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, series } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";
import { ensureRolesTemplateSchema } from "@/lib/db/ensure-roles-template-schema";
import { syncSeriesMembersIntoProject } from "@/lib/series-access";

// GET /api/projects — list projects for the current user
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(projects.createdAt);

  return Response.json(rows);
}

// POST /api/projects — create a new project
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { title, shootDate, description, projectType, seriesId } = await request.json();
  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  await ensureRolesTemplateSchema();

  // If a series was chosen, confirm the user owns it before attaching.
  let attachSeriesId: number | null = null;
  if (seriesId) {
    await ensureSeriesSchema();
    const sid = parseInt(String(seriesId), 10);
    if (!isNaN(sid)) {
      const [row] = await db.select().from(series).where(eq(series.id, sid));
      if (row && row.ownerId === userId) attachSeriesId = sid;
    }
  }

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: userId,
      title: title.trim(),
      projectType: projectType ?? null,
      shootDate: shootDate ?? null,
      description: description ?? null,
      seriesId: attachSeriesId,
      rolesTemplateLoaded: false,
    })
    .returning();

  // Bring the series team onto the new project.
  if (attachSeriesId) {
    await syncSeriesMembersIntoProject(attachSeriesId, project.id);
  }

  return Response.json(project, { status: 201 });
}
