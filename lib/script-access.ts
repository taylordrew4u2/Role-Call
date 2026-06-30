import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { Project } from "@/lib/db/schema";

type CollaboratorOk = {
  ok: true;
  userId: string;
  id: number;
  project: Project;
  isOwner: boolean;
  isWriter: boolean;
};
type Err = { ok: false; response: Response };

/** The appointed writer's Clerk ID, or null if none is set. */
export function writerIdOf(project: Project): string | null {
  return project.scriptWriterId ?? null;
}

/**
 * Resolves project access for any collaborator (owner or a member who has
 * joined). Returns flags describing whether the caller is the owner and/or the
 * appointed script writer.
 */
export async function getCollaboratorAccess(
  projectIdStr: string
): Promise<CollaboratorOk | Err> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const id = parseInt(projectIdStr, 10);
  if (isNaN(id)) {
    return { ok: false, response: Response.json({ error: "Invalid project ID" }, { status: 400 }) };
  }
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) {
    return { ok: false, response: Response.json({ error: "Project not found" }, { status: 404 }) };
  }

  const isOwner = project.ownerId === userId;
  let isMember = isOwner;
  if (!isMember) {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.clerkUserId, userId)
        )
      );
    isMember = Boolean(member);
  }
  if (!isMember) {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const writerId = writerIdOf(project);
  return {
    ok: true,
    userId,
    id,
    project,
    isOwner,
    isWriter: writerId !== null && writerId === userId,
  };
}

/** Like getCollaboratorAccess but requires the caller to be the script writer. */
export async function requireScriptWriter(
  projectIdStr: string
): Promise<CollaboratorOk | Err> {
  const access = await getCollaboratorAccess(projectIdStr);
  if (!access.ok) return access;
  if (!access.isWriter) {
    return {
      ok: false,
      response: Response.json(
        { error: "Only the appointed script writer can do that." },
        { status: 403 }
      ),
    };
  }
  return access;
}
