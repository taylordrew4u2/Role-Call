import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { getAppUrl } from "@/lib/get-app-url";
import { eq, and } from "drizzle-orm";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";
import { requireProjectManager } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/members
export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);

  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));

  return Response.json(members);
}

// POST /api/projects/[projectId]/members — invite a member
export async function POST(
  request: Request,
  { params }: { params: Params }
) {
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;
  const { id, project } = access;

  const { email, displayName, kind, character, position } = await request.json();
  if (!displayName?.trim()) {
    return Response.json({ error: "A name is required" }, { status: 400 });
  }

  await ensureScriptSchema();

  // A member is invited as a writer or a director (or neither for plain cast/crew).
  const normalizedPosition =
    position === "writer" ? "writer" : position === "director" ? "director" : null;

  // Create member record. Email is optional (e.g. cast added without one);
  // Every member is created with an invite link and starts as "invited";
  // they become "active" when they open that link.
  const [member] = await db
    .insert(projectMembers)
    .values({
      projectId: id,
      email: email?.trim() || null,
      displayName: displayName.trim(),
      kind: kind === "cast" ? "cast" : "crew",
      position: normalizedPosition,
      positions: normalizedPosition ? [normalizedPosition] : [],
      character: character?.trim() || null,
      status: "invited",
    })
    .returning();

  // Send invitation email via Resend (lazily imported to avoid build-time errors)
  const joinUrl = new URL(
    `/api/invite?projectId=${id}&memberId=${member.id}`,
    getAppUrl(request)
  ).toString();

  // emailStatus tells the client what actually happened so it can give honest
  // feedback (and fall back to a copyable invite link):
  //   "sent"       — Resend accepted the message
  //   "skipped"    — no API key configured, or no email address given
  //   "failed"     — Resend rejected the send (e.g. unverified from-domain)
  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
  let emailError: string | undefined;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && email?.trim()) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: `RoleCall <noreply@${process.env.RESEND_FROM_DOMAIN ?? "rolecall.space"}>`,
        to: email,
        subject: `You've been invited to "${project.title}" on RoleCall`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h1 style="font-size:22px;color:#0f172a;">You're invited to join a film project!</h1>
            <p style="color:#475569;">Hi ${displayName},</p>
            <p style="color:#475569;">
              You've been invited to collaborate on <strong>${project.title}</strong> on RoleCall —
              the all-in-one production responsibility tracker.
            </p>
            <a href="${joinUrl}"
               style="display:inline-block;margin:16px 0;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Join the Project →
            </a>
            <p style="color:#94a3b8;font-size:12px;">
              If you weren't expecting this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
      // Resend returns { data, error } and does NOT throw on a rejected send,
      // so the error field must be checked explicitly.
      if (error) {
        emailStatus = "failed";
        emailError = error.message;
        console.error("Resend send error:", error);
      } else {
        emailStatus = "sent";
      }
    } catch (err) {
      // Email failure must not block member creation.
      emailStatus = "failed";
      emailError = err instanceof Error ? err.message : "Unknown email error";
      console.error("Resend error:", err);
    }
  }

  return Response.json(
    { ...member, inviteUrl: joinUrl, emailStatus, emailError },
    { status: 201 }
  );
}

// DELETE /api/projects/[projectId]/members/[memberId] — remove a member
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;
  const { id } = access;

  // Parse memberId from URL — DELETE /api/projects/[projectId]/members?memberId=123
  const url = new URL(_request.url);
  const memberIdStr = url.searchParams.get("memberId");
  const memberId = memberIdStr ? parseInt(memberIdStr, 10) : NaN;
  if (isNaN(memberId))
    return Response.json({ error: "Invalid member ID" }, { status: 400 });

  // Delete the member
  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, id),
        eq(projectMembers.id, memberId)
      )
    );

  return Response.json({ success: true }, { status: 200 });
}
