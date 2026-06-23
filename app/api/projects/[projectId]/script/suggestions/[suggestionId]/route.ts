import { db } from "@/lib/db";
import { scriptSuggestions, scripts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireScriptWriter } from "@/lib/script-access";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";

type Params = Promise<{ projectId: string; suggestionId: string }>;

// PATCH /api/projects/[projectId]/script/suggestions/[suggestionId]
// Body: { action: "approve" | "decline" }. Writer-only.
// Approving an edit applies the replacement to the editing draft.
export async function PATCH(request: Request, { params }: { params: Params }) {
  const { projectId, suggestionId } = await params;
  await ensureScriptSchema();
  const access = await requireScriptWriter(projectId);
  if (!access.ok) return access.response;

  const sid = parseInt(suggestionId, 10);
  if (isNaN(sid)) return Response.json({ error: "Invalid suggestion ID" }, { status: 400 });

  const { action } = await request.json();
  if (action !== "approve" && action !== "decline") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const [suggestion] = await db
    .select()
    .from(scriptSuggestions)
    .where(
      and(
        eq(scriptSuggestions.id, sid),
        eq(scriptSuggestions.projectId, access.id)
      )
    );
  if (!suggestion) return Response.json({ error: "Not found" }, { status: 404 });
  if (suggestion.status !== "pending") {
    return Response.json({ error: "Already resolved" }, { status: 409 });
  }

  let updatedScript = null;

  // On approval, apply the replacement to the editing draft when there's an
  // anchor to replace. Replace only the first occurrence to stay predictable.
  if (action === "approve" && suggestion.anchorText) {
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.projectId, access.id));
    if (script && script.content.includes(suggestion.anchorText)) {
      const nextContent = script.content.replace(
        suggestion.anchorText,
        suggestion.suggestedText
      );
      [updatedScript] = await db
        .update(scripts)
        .set({ content: nextContent, updatedAt: new Date() })
        .where(eq(scripts.projectId, access.id))
        .returning();
    }
  }

  const [updated] = await db
    .update(scriptSuggestions)
    .set({
      status: action === "approve" ? "approved" : "declined",
      resolvedBy: access.userId,
      resolvedAt: new Date(),
    })
    .where(eq(scriptSuggestions.id, sid))
    .returning();

  return Response.json({ suggestion: updated, script: updatedScript });
}
