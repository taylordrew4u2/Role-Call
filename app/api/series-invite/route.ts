import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";
import { seriesMembers, projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";

// GET /api/series-invite?seriesId=X&memberId=Y — accept a series invite.
// Marks the member active and, if the visitor is signed in, links their Clerk
// account so they get access to every project in the series.
export async function GET(request: Request) {
  await ensureSeriesSchema();
  const url = new URL(request.url);
  const seriesId = parseInt(url.searchParams.get("seriesId") ?? "", 10);
  const memberId = parseInt(url.searchParams.get("memberId") ?? "", 10);
  if (isNaN(seriesId) || isNaN(memberId)) {
    return Response.json({ error: "Invalid invite link" }, { status: 400 });
  }

  const [member] = await db
    .select()
    .from(seriesMembers)
    .where(and(eq(seriesMembers.id, memberId), eq(seriesMembers.seriesId, seriesId)));
  if (!member) {
    return Response.json({ error: "Invite not found" }, { status: 404 });
  }

  const { userId } = await auth();

  // Mark the series member active, capturing the Clerk account when available.
  await db
    .update(seriesMembers)
    .set({ status: "active", clerkUserId: userId ?? member.clerkUserId })
    .where(eq(seriesMembers.id, memberId));

  // Propagate to every project this member was fanned out into.
  await db
    .update(projectMembers)
    .set({ status: "active", clerkUserId: userId ?? member.clerkUserId })
    .where(eq(projectMembers.seriesMemberId, memberId));

  return Response.redirect(new URL(`/dashboard/series/${seriesId}`, getAppUrl(request)));
}
