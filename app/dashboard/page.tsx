import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clapperboard, Plus, Calendar, Film } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(projects.createdAt);

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
              {userProjects.length === 0
                ? "Start by creating your first project."
                : `You have ${userProjects.length} project${userProjects.length !== 1 ? "s" : ""}.`}
            </p>
          </div>
        </div>

        {userProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <Film className="h-12 w-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-semibold text-slate-700">
              No projects yet
            </h2>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userProjects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/${project.id}`}
                className="group"
              >
                <Card className="h-full transition-shadow hover:shadow-md cursor-pointer group-hover:border-slate-300">
                  <CardHeader>
                    <CardTitle className="text-base line-clamp-2">
                      {project.title}
                    </CardTitle>
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
        )}
      </main>
    </div>
  );
}
