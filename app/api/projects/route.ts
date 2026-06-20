import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  const { title, shootDate, description, projectType } = await request.json();
  if (!title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: userId,
      title: title.trim(),
      projectType: projectType ?? null,
      shootDate: shootDate ?? null,
      description: description ?? null,
    })
    .returning();

  return Response.json(project, { status: 201 });
}
