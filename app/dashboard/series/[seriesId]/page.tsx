import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { series, seriesMembers, projects } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { UserButton } from "@clerk/nextjs";
import { Clapperboard, ArrowLeft } from "lucide-react";
import { getSeriesAccess } from "@/lib/series-access";
import { ensureSeriesSchema } from "@/lib/db/ensure-series-schema";
import { SeriesWorkspace } from "@/components/SeriesWorkspace";
import { AppBottomNav } from "@/components/AppBottomNav";

type Params = Promise<{ seriesId: string }>;

export default async function SeriesPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { seriesId } = await params;
  await ensureSeriesSchema();

  const access = await getSeriesAccess(seriesId);
  if (!access.ok) redirect("/dashboard");

  const [row] = await db.select().from(series).where(eq(series.id, access.id));

  const [seriesProjects, members, addable] = await Promise.all([
    db.select().from(projects).where(eq(projects.seriesId, access.id)),
    db.select().from(seriesMembers).where(eq(seriesMembers.seriesId, access.id)),
    // The owner's standalone projects that could be added to this series.
    db
      .select()
      .from(projects)
      .where(and(eq(projects.ownerId, userId), isNull(projects.seriesId))),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-slate-900">
            <Clapperboard className="h-6 w-6 text-red-600" />
            <span className="hidden sm:inline">RoleCall</span>
          </Link>
        </div>
        <div className="hidden sm:block">
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        <SeriesWorkspace
          seriesId={access.id}
          isOwner={access.isOwner}
          title={row.title}
          description={row.description}
          initialProjects={seriesProjects}
          initialMembers={members}
          addableProjects={access.isOwner ? addable : []}
        />
      </main>
      <AppBottomNav />
    </div>
  );
}
