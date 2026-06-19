import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clapperboard, CheckCircle2, Users2, Zap } from "lucide-react";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
          <Clapperboard className="h-6 w-6 text-red-600" />
          RoleCall
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm text-red-700 font-medium mb-6">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Built for short film productions
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-3xl leading-tight">
          Every responsibility.{" "}
          <span className="text-red-600">Every person.</span>
          {" "}No excuses.
        </h1>
        <p className="mt-6 text-lg text-slate-500 max-w-xl">
          RoleCall makes sure every role on your short film has an owner so
          nothing falls through the cracks on shoot day.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Button size="lg" asChild>
            <Link href="/sign-up">Create your first project →</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />,
              title: "20 pre-loaded roles",
              body: "From Director to Data Wrangler — every short film responsibility with full duty descriptions.",
            },
            {
              icon: <Users2 className="h-6 w-6 text-blue-500" />,
              title: "Invite your crew",
              body: "Send email invites via Resend and assign roles in seconds with a searchable dropdown.",
            },
            {
              icon: <Zap className="h-6 w-6 text-amber-500" />,
              title: "Lean 8-person template",
              body: "One click to apply the proven small-crew distribution — perfect for student or indie shoots.",
            },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-3">
              {f.icon}
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} RoleCall · Built with Next.js, Clerk &amp; Vercel
      </footer>
    </main>
  );
}
