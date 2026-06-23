import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireScriptWriter } from "@/lib/script-access";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/script/publish — publish the current editing
// draft as the final script. Writer-only.
export async function POST(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  await ensureScriptSchema();
  const access = await requireScriptWriter(projectId);
  if (!access.ok) return access.response;

  const [existing] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, access.id));

  const content = existing?.content ?? "";

  if (existing) {
    const [updated] = await db
      .update(scripts)
      .set({ finalContent: content, updatedAt: new Date() })
      .where(eq(scripts.projectId, access.id))
      .returning();
    return Response.json(updated);
  }

  const [created] = await db
    .insert(scripts)
    .values({ projectId: access.id, content, finalContent: content })
    .returning();
  return Response.json(created, { status: 201 });
}
