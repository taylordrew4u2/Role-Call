import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Project } from "@/lib/db/schema";
import { ensureAllSchema } from "@/lib/db/ensure-all-schema";

type Ok = { ok: true; userId: string; id: number; project: Project };
type Err = { ok: false; response: Response };

/**
 * Resolves and authorizes access to a project for an API route.
 * Returns the project + user on success, or a ready-to-return error Response.
 */
export async function getProjectAccess(projectIdStr: string): Promise<Ok | Err> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const id = parseInt(projectIdStr, 10);
  if (isNaN(id)) {
    return { ok: false, response: Response.json({ error: "Invalid project ID" }, { status: 400 }) };
  }
  await ensureAllSchema();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) {
    return { ok: false, response: Response.json({ error: "Project not found" }, { status: 404 }) };
  }
  return { ok: true, userId, id, project };
}

/** Like getProjectAccess but also requires the caller to be the project owner. */
export async function requireProjectOwner(projectIdStr: string): Promise<Ok | Err> {
  const access = await getProjectAccess(projectIdStr);
  if (!access.ok) return access;
  if (access.project.ownerId !== access.userId) {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return access;
}
