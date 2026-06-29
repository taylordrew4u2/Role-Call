import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { Project, ProjectMember } from "@/lib/db/schema";
import { ensureAllSchema } from "@/lib/db/ensure-all-schema";

type Ok = { ok: true; userId: string; id: number; project: Project };
type Err = { ok: false; response: Response };

/**
 * Returns the effective positions for a member, merging the legacy `position`
 * field with the new `positions` array.
 */
export function memberPositions(member: ProjectMember): string[] {
  const arr = (member.positions as string[] | null) ?? [];
  if (arr.length) return arr;
  // Fall back to the legacy single-value field.
  return member.position ? [member.position] : [];
}

/**
 * True admin (owner-tier): the project creator OR a member who holds the
 * "owner" position. Owners can manage members, assign roles, and change
 * project settings.
 */
export async function isProjectAdmin(
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
  return memberPositions(member ?? ({} as ProjectMember)).includes("owner");
}

/**
 * Content editor: the writer OR any owner/director. Writers have full editing
 * control over shots, scenes, schedule, and the script. Directors and owners
 * can also edit directly (suggestion-only flow is a future enhancement).
 */
export async function isProjectEditor(
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
  if (!member) return false;
  const positions = memberPositions(member);
  return positions.some((p) => ["owner", "director", "writer"].includes(p));
}

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
 * A "manager" is anyone with project-wide management access: the original
 * owner, members with the "owner" position, directors, or the writer.
 * This is the gate for most management actions.
 */
export async function isProjectManager(
  project: Project,
  userId: string
): Promise<boolean> {
  return isProjectEditor(project, userId);
}

/** Requires admin-level access (owner or member with "owner" position). */
export async function requireProjectAdmin(projectIdStr: string): Promise<Ok | Err> {
  const access = await getProjectAccess(projectIdStr);
  if (!access.ok) return access;
  if (await isProjectAdmin(access.project, access.userId)) return access;
  return {
    ok: false,
    response: Response.json(
      { error: "Only a project owner can do that." },
      { status: 403 }
    ),
  };
}

/** Requires editor-level access (writer, director, or owner). */
export async function requireProjectEditor(projectIdStr: string): Promise<Ok | Err> {
  const access = await getProjectAccess(projectIdStr);
  if (!access.ok) return access;
  if (await isProjectEditor(access.project, access.userId)) return access;
  return {
    ok: false,
    response: Response.json(
      { error: "Only the writer, a director, or an owner can do that." },
      { status: 403 }
    ),
  };
}

// Aliases kept for backward compatibility with existing API routes.
export const requireProjectManager = requireProjectEditor;
export const requireProjectOwner = requireProjectAdmin;
export const requireProjectDirector = requireProjectEditor;
