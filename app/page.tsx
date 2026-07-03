import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Clapperboard, ListVideo, Star, UsersRound, PenLine } from "lucide-react";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// Structured data for search engines and AI answer engines (Google rich
// results, ChatGPT/Perplexity-style citation crawlers all consume JSON-LD).
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Shot list generated from a screenplay",
        "Cast list extracted from the script",
        "Crew role assignments with backups",
        "Screenplay editor with suggestion workflow",
        "Shooting schedule and call sheets",
        "Shoot locations pinned on an interactive map",
      ],
      audience: {
        "@type": "Audience",
        audienceType: "Indie and student filmmakers",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is RoleCall?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "RoleCall is a free web app for planning indie and student film productions. It turns a screenplay into a shot list, extracts the cast, assigns crew roles, and builds schedules, call sheets, and location maps.",
          },
        },
        {
          "@type": "Question",
          name: "Can RoleCall generate a shot list from my script?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Paste or upload your screenplay (PDF, Final Draft .fdx, Fountain, or plain text) and RoleCall parses scenes and generates a starter shot list — action coverage, dialogue coverage, or both — tagged by character, using pure text parsing with no AI cost.",
          },
        },
        {
          "@type": "Question",
          name: "Is RoleCall free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, RoleCall is free to use. Invite your whole cast and crew by link — no per-seat pricing.",
          },
        },
      ],
    },
  ],
};

const FEATURES = [
  {
    icon: <ListVideo className="h-7 w-7 text-red-500" />,
    title: "Shot list from script",
    body: "Paste your screenplay and RoleCall generates scenes and shots — action, dialogue coverage, or both — tagged by character, with zero AI cost.",
  },
  {
    icon: <Star className="h-7 w-7 text-violet-500" />,
    title: "Cast from script",
    body: "One click pulls every speaking character from the script. Assign who plays each role and track whether parts are filled.",
  },
  {
    icon: <UsersRound className="h-7 w-7 text-blue-500" />,
    title: "Cast & crew in one place",
    body: "Side-by-side cast and collaborator views. Invite the whole team by link — no per-seat accounts, no email required.",
  },
  {
    icon: <PenLine className="h-7 w-7 text-amber-500" />,
    title: "Script workspace",
    body: "Write and format your screenplay in the app, or upload a PDF. Non-writers suggest edits; the writer approves them.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
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
          Built for indie &amp; student film productions
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-3xl leading-tight">
          Every responsibility.{" "}
          <span className="text-red-600">Every person.</span>
          {" "}No excuses.
        </h1>
        <p className="mt-6 text-lg text-slate-500 max-w-xl">
          Paste a screenplay and RoleCall extracts the cast, builds a shot list, and assigns your whole crew — all from one link, no accounts needed.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Button size="lg" asChild>
            <Link href="/sign-up">Start your project →</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-3">
              {f.icon}
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} RoleCall · Built with Next.js, Clerk &amp; Vercel</p>
        <p className="mt-1.5 flex items-center justify-center gap-3">
          <Link href="/privacy" className="hover:text-slate-600 underline underline-offset-2">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-600 underline underline-offset-2">
            Terms of Service
          </Link>
        </p>
      </footer>
    </main>
  );
}
