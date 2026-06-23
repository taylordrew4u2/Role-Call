import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projects, series, seriesMembers, projectMembers } from "@/lib/db/schema";
import { eq, inArray, or } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clapperboard, Plus, Calendar, Film, Layers } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { formatDate } from "@/lib/utils";
import { getProductionType } from "@/lib/production-types";
import { CreateSeriesButton } from "@/components/CreateSeriesButton";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await ensureSeriesSchema();
  const user = await currentUser();

  // Projects the user owns or has joined as a member.
  const memberProjectRows = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.clerkUserId, userId));
  const memberProjectIds = [...new Set(memberProjectRows.map((r) => r.projectId))];

  const userProjects = await db
    .select()
    .from(projects)
    .where(
      memberProjectIds.length
        ? or(eq(projects.ownerId, userId), inArray(projects.id, memberProjectIds))
        : eq(projects.ownerId, userId)
    )
    .orderBy(projects.createdAt);

  // Series the user owns or belongs to.
  const memberSeriesRows = await db
    .select({ seriesId: seriesMembers.seriesId })
    .from(seriesMembers)
    .where(eq(seriesMembers.clerkUserId, userId));
  const memberSeriesIds = [...new Set(memberSeriesRows.map((r) => r.seriesId))];

  const userSeries = await db
    .select()
    .from(series)
    .where(
      memberSeriesIds.length
        ? or(eq(series.ownerId, userId), inArray(series.id, memberSeriesIds))
        : eq(series.ownerId, userId)
    )
    .orderBy(series.createdAt);

  // Count projects per series for the cards.
  const seriesProjectCounts = new Map<number, number>();
  for (const p of userProjects) {
    if (p.seriesId != null) {
      seriesProjectCounts.set(p.seriesId, (seriesProjectCounts.get(p.seriesId) ?? 0) + 1);
    }
  }

  // Standalone projects (not part of a series) for the main grid.
  const standaloneProjects = userProjects.filter((p) => p.seriesId == null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-xl text-slate-900"
        >
          <Clapperboard className="h-6 w-6 text-red-600" />
          RoleCall
        </Link>
        <div className="flex items-center gap-3">
          <CreateSeriesButton />
          <Button asChild size="sm">
            <Link href="/dashboard/new">
              <Plus className="h-4 w-4 mr-1" /> New Project
            </Link>
          </Button>
          <UserButton />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.firstName ?? "Director"} 🎬
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {userProjects.length === 0 && userSeries.length === 0
                ? "Start by creating your first project or series."
                : `You have ${userProjects.length} project${userProjects.length !== 1 ? "s" : ""}${
                    userSeries.length ? ` across ${userSeries.length} series` : ""
                  }.`}
            </p>
          </div>
        </div>

        {/* Series section */}
        {userSeries.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Series
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userSeries.map((s) => (
                <Link key={s.id} href={`/dashboard/series/${s.id}`} className="group">
                  <Card className="h-full transition-shadow hover:shadow-md cursor-pointer group-hover:border-slate-300 border-l-4 border-l-red-500">
                    <CardHeader>
                      <span className="inline-flex items-center gap-1 w-fit rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600 mb-1">
                        <Layers className="h-3 w-3" /> Series
                      </span>
                      <CardTitle className="text-base line-clamp-2">{s.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {seriesProjectCounts.get(s.id) ?? 0} project
                        {(seriesProjectCounts.get(s.id) ?? 0) !== 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    {s.description && (
                      <CardContent>
                        <p className="text-sm text-slate-500 line-clamp-2">{s.description}</p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {userProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <Film className="h-12 w-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-700">No projects yet</h2>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Create a project to start assigning roles to your crew.
            </p>
            <Button asChild>
              <Link href="/dashboard/new">
                <Plus className="h-4 w-4 mr-1" /> Create project
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {userSeries.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Film className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Standalone projects
                </h2>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {standaloneProjects.map((project) => (
                <Link key={project.id} href={`/dashboard/${project.id}`} className="group">
                  <Card className="h-full transition-shadow hover:shadow-md cursor-pointer group-hover:border-slate-300">
                    <CardHeader>
                      {(() => {
                        const pt = getProductionType(project.projectType);
                        return pt ? (
                          <span className="inline-flex items-center gap-1 w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 mb-1">
                            <span>{pt.emoji}</span>
                            {pt.label}
                          </span>
                        ) : null;
                      })()}
                      <CardTitle className="text-base line-clamp-2">{project.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(project.shootDate)}
                      </CardDescription>
                    </CardHeader>
                    {project.description && (
                      <CardContent>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {project.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}

              {/* Add new card */}
              <Link href="/dashboard/new" className="group">
                <div className="h-full min-h-[120px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-6 text-center transition-colors hover:border-slate-400 hover:bg-slate-50 cursor-pointer">
                  <Plus className="h-8 w-8 text-slate-300 group-hover:text-slate-500 mb-2" />
                  <span className="text-sm text-slate-400 group-hover:text-slate-600 font-medium">
                    New project
                  </span>
                </div>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
