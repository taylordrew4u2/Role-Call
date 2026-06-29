import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UserButton } from "@clerk/nextjs";
import { Clapperboard, ArrowLeft, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ProjectTabs } from "@/components/ProjectTabs";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import { EditProjectButton } from "@/components/EditProjectButton";
import { getProductionType } from "@/lib/production-types";
import { ensureAllSchema } from "@/lib/db/ensure-all-schema";
import { isProjectManager, isProjectAdmin } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  await ensureAllSchema();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  // Directors have the same powers as the owner.
  const canManage = await isProjectManager(project, userId);
  const isAdmin = await isProjectAdmin(project, userId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-200 bg-white px-4 sm:px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-xl text-slate-900"
          >
            <Clapperboard className="h-6 w-6 text-red-600" />
            <span className="hidden sm:inline">RoleCall</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <EditProjectButton
                projectId={id}
                title={project.title}
                projectType={project.projectType}
                shootDate={project.shootDate}
                description={project.description}
              />
              <DeleteProjectButton projectId={id} projectTitle={project.title} />
            </>
          )}
          <UserButton />
        </div>
      </header>

      {/* Project title */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-5 pb-3">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
            {project.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Shoot day: {formatDate(project.shootDate)}
            </span>
            {(() => {
              const pt = getProductionType(project.projectType);
              return pt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  <span>{pt.emoji}</span>
                  {pt.label}
                </span>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <ProjectTabs projectId={id} isAdmin={isAdmin} />

      {children}
    </div>
  );
}
