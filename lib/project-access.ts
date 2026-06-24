import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
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

/**
 * Like getProjectAccess but requires the caller to be the owner OR a joined
 * member invited as a director. Used for the shot list (shots, scenes, shoot
 * days), which directors are allowed to build and edit.
 */
export async function requireProjectDirector(projectIdStr: string): Promise<Ok | Err> {
  const access = await getProjectAccess(projectIdStr);
  if (!access.ok) return access;
  if (access.project.ownerId === access.userId) return access;

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, access.id),
        eq(projectMembers.clerkUserId, access.userId)
      )
    );
  if (member?.position === "director") return access;

  return {
    ok: false,
    response: Response.json(
      { error: "Only the owner or a director can do that." },
      { status: 403 }
    ),
  };
}
