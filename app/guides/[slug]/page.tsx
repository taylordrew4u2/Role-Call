import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clapperboard, ArrowLeft, Clock } from "lucide-react";
import { GUIDES, getGuide } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      url: `${SITE_URL}/guides/${guide.slug}`,
    },
  };
}

function renderBody(body: string) {
  const blocks = body.split(/\n\n+/);
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length) {
      out.push(
        <ul key={key++} className="my-4 list-disc pl-6 space-y-1.5">
          {listBuffer.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (const block of blocks) {
    const lines = block.split("\n");
    for (const line of lines) {
      if (line.startsWith("## ")) {
        flushList();
        out.push(
          <h2 key={key++} className="text-xl font-semibold text-slate-900 mt-8 mb-3">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("- ")) {
        listBuffer.push(line.slice(2));
      } else if (line.trim()) {
        flushList();
        out.push(
          <p key={key++} className="my-4 leading-relaxed">
            {line}
          </p>
        );
      }
    }
    flushList();
  }
  return out;
}

export default async function GuidePage({ params }: { params: Params }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    url: `${SITE_URL}/guides/${guide.slug}`,
    publisher: { "@type": "Organization", name: "RoleCall", url: SITE_URL },
  };

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-lg text-slate-900 mb-8"
      >
        <Clapperboard className="h-5 w-5 text-red-600" />
        RoleCall
      </Link>

      <Link
        href="/guides"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All guides
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-slate-900 leading-tight">
        {guide.title}
      </h1>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Clock className="h-3.5 w-3.5" /> {guide.minutes} min read
      </p>

      <article className="mt-6 text-[15px] text-slate-700">
        {renderBody(guide.body)}
      </article>

      <div className="mt-12 rounded-xl border border-red-100 bg-red-50 p-6">
        <h2 className="font-semibold text-slate-900">
          Plan your production with RoleCall
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          RoleCall turns your screenplay into a shot list, extracts the cast,
          assigns every crew role, and builds your schedule — free.
        </p>
        <Link
          href="/sign-up"
          className="mt-4 inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          Start your project →
        </Link>
      </div>
    </main>
  );
}
