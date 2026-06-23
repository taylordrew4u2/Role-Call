import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";
import { projects, projectMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";

// GET /api/invite?projectId=X&memberId=Y — accept invite landing
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = parseInt(url.searchParams.get("projectId") ?? "", 10);
  const memberId = parseInt(url.searchParams.get("memberId") ?? "", 10);

  if (isNaN(projectId) || isNaN(memberId)) {
    return Response.json({ error: "Invalid invite link" }, { status: 400 });
  }

  await ensureScriptSchema();

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.id, memberId),
        eq(projectMembers.projectId, projectId)
      )
    );

  if (!member) {
    return Response.json({ error: "Invite not found" }, { status: 404 });
  }

  // Mark as active, linking the signed-in Clerk account when available so the
  // project shows up on their dashboard.
  const { userId } = await auth();
  await db
    .update(projectMembers)
    .set({ status: "active", clerkUserId: userId ?? member.clerkUserId })
    .where(eq(projectMembers.id, memberId));

  // A member invited as the writer becomes the project's appointed script
  // writer once they join and link their account.
  if (member.position === "writer" && userId) {
    await db
      .update(projects)
      .set({ scriptWriterId: userId })
      .where(eq(projects.id, projectId));
  }

  // Redirect to the project page (user must sign in to view)
  return Response.redirect(new URL(`/dashboard/${projectId}`, getAppUrl(request)));
}
