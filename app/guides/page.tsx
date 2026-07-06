import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard, Clock, ArrowRight } from "lucide-react";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Film Production Guides",
  description:
    "Free, practical guides for indie and student filmmakers: shot lists, call sheets, single-camera coverage, crew roles, script breakdowns, and running a shoot day.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-lg text-slate-900 mb-10"
      >
        <Clapperboard className="h-5 w-5 text-red-600" />
        RoleCall
      </Link>

      <h1 className="text-3xl font-bold text-slate-900">Production Guides</h1>
      <p className="mt-2 text-slate-500 max-w-2xl">
        Practical, no-fluff guides for planning and running small film
        productions — the same craft RoleCall automates.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-red-300 hover:shadow-md"
          >
            <h2 className="font-semibold text-slate-900 group-hover:text-red-600 transition-colors">
              {g.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500 line-clamp-3">{g.description}</p>
            <p className="mt-3 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {g.minutes} min read
              </span>
              <span className="flex items-center gap-1 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Read <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
