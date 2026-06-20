import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string; memberId: string }>;

const FIELDS = ["displayName", "character", "email", "kind"] as const;

// PATCH /api/projects/[projectId]/members/[memberId]
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { projectId, memberId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const mid = parseInt(memberId, 10);
  if (isNaN(mid)) return Response.json({ error: "Invalid member ID" }, { status: 400 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  for (const f of FIELDS) {
    if (f in body) updates[f] = body[f] === "" ? null : body[f];
  }
  if ("displayName" in updates && !String(updates.displayName ?? "").trim()) {
    return Response.json({ error: "A name is required" }, { status: 400 });
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(projectMembers)
    .set(updates)
    .where(and(eq(projectMembers.id, mid), eq(projectMembers.projectId, access.id)))
    .returning();
  if (!updated) return Response.json({ error: "Member not found" }, { status: 404 });
  return Response.json(updated);
}

// DELETE /api/projects/[projectId]/members/[memberId]
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { projectId, memberId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const mid = parseInt(memberId, 10);
  if (isNaN(mid)) return Response.json({ error: "Invalid member ID" }, { status: 400 });

  await db
    .delete(projectMembers)
    .where(
      and(eq(projectMembers.id, mid), eq(projectMembers.projectId, access.id))
    );
  return Response.json({ ok: true });
}
