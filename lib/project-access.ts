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

/**
 * A "manager" is the project owner OR a joined member invited as a director.
 * Directors have the same permissions as the owner, so this is the check that
 * gates every management action. Safe to call from server components too.
 */
export async function isProjectManager(
  project: Project,
  userId: string
): Promise<boolean> {
  if (project.ownerId === userId) return true;
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, project.id),
        eq(projectMembers.clerkUserId, userId)
      )
    );
  return member?.position === "director";
}

/**
 * Like getProjectAccess but requires the caller to be a manager (owner or a
 * joined director). This is the gate for all management endpoints.
 */
export async function requireProjectManager(projectIdStr: string): Promise<Ok | Err> {
  const access = await getProjectAccess(projectIdStr);
  if (!access.ok) return access;
  if (await isProjectManager(access.project, access.userId)) return access;
  return {
    ok: false,
    response: Response.json(
      { error: "Only the owner or a director can do that." },
      { status: 403 }
    ),
  };
}

// Back-compat aliases. Directors have full owner parity, so the historical
// "owner" and "director" gates both resolve to the manager check.
export const requireProjectOwner = requireProjectManager;
export const requireProjectDirector = requireProjectManager;
