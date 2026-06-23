import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCollaboratorAccess, requireScriptWriter } from "@/lib/script-access";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/script — fetch the script (or empty default)
export async function GET(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  await ensureScriptSchema();
  const access = await getCollaboratorAccess(projectId);
  if (!access.ok) return access.response;

  const [script] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, access.id));

  return Response.json(
    script ?? {
      projectId: access.id,
      content: "",
      finalContent: "",
      fileUrl: null,
      fileName: null,
    }
  );
}

// PUT /api/projects/[projectId]/script — save the editing draft (upsert).
// Allowed for the appointed script writer (owner by default).
export async function PUT(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  await ensureScriptSchema();
  const access = await requireScriptWriter(projectId);
  if (!access.ok) return access.response;

  const { content } = await request.json();

  const [existing] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, access.id));

  if (existing) {
    const [updated] = await db
      .update(scripts)
      .set({ content: content ?? "", updatedAt: new Date() })
      .where(eq(scripts.projectId, access.id))
      .returning();
    return Response.json(updated);
  }

  const [created] = await db
    .insert(scripts)
    .values({ projectId: access.id, content: content ?? "" })
    .returning();
  return Response.json(created, { status: 201 });
}
