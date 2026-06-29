import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AdminBoard } from "@/components/AdminBoard";
import { getProjectAccess, isProjectAdmin } from "@/lib/project-access";
import { ensureAllSchema } from "@/lib/db/ensure-all-schema";

type Params = Promise<{ projectId: string }>;

export default async function AdminPage({ params }: { params: Params }) {
  const { projectId } = await params;
  await ensureAllSchema();

  const access = await getProjectAccess(projectId);
  if (!access.ok) redirect("/dashboard");

  const { project, userId, id } = access;
  const isAdmin = await isProjectAdmin(project, userId);
  if (!isAdmin) redirect(`/dashboard/${id}`);

  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));

  return (
    <div className="flex-1 px-4 sm:px-6 py-6">
      <div className="max-w-2xl mx-auto">
        <AdminBoard
          projectId={id}
          members={members}
          isProjectOwner={isAdmin}
        />
      </div>
    </div>
  );
}
