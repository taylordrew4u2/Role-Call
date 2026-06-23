import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireSeriesOwner, syncSeriesMembersIntoProject } from "@/lib/series-access";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";

type Params = Promise<{ seriesId: string }>;

// POST /api/series/[seriesId]/projects — add an existing project to the series.
// Owner only (and must own the project). All series members fan out into it.
export async function POST(request: Request, { params }: { params: Params }) {
  const { seriesId } = await params;
  await ensureSeriesSchema();
  const access = await requireSeriesOwner(seriesId);
  if (!access.ok) return access.response;

  const { projectId } = await request.json();
  const pid = parseInt(String(projectId), 10);
  if (isNaN(pid)) return Response.json({ error: "Invalid project ID" }, { status: 400 });

  const [project] = await db.select().from(projects).where(eq(projects.id, pid));
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  if (project.ownerId !== access.userId) {
    return Response.json({ error: "You can only add your own projects." }, { status: 403 });
  }

  await db.update(projects).set({ seriesId: access.id }).where(eq(projects.id, pid));
  await syncSeriesMembersIntoProject(access.id, pid);

  return Response.json({ success: true });
}

// DELETE /api/series/[seriesId]/projects?projectId=X — detach a project. Owner only.
export async function DELETE(request: Request, { params }: { params: Params }) {
  const { seriesId } = await params;
  await ensureSeriesSchema();
  const access = await requireSeriesOwner(seriesId);
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const pid = parseInt(url.searchParams.get("projectId") ?? "", 10);
  if (isNaN(pid)) return Response.json({ error: "Invalid project ID" }, { status: 400 });

  await db
    .update(projects)
    .set({ seriesId: null })
    .where(and(eq(projects.id, pid), eq(projects.seriesId, access.id)));

  return Response.json({ success: true });
}
