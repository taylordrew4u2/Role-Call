import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of RoleCall.",
};

const EFFECTIVE_DATE = "July 3, 2026";

export default function TermsPage() {
  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-lg text-slate-900 mb-8"
      >
        <Clapperboard className="h-5 w-5 text-red-600" />
        RoleCall
      </Link>

      <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <div className="mt-8 max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 text-[15px] leading-relaxed">
        <p>
          By using RoleCall you agree to these terms. If you don&apos;t agree,
          don&apos;t use the service.
        </p>

        <h2>The service</h2>
        <p>
          RoleCall is a free planning tool for film productions: scripts, shot lists,
          crew roles, schedules, and locations. It is provided &ldquo;as is&rdquo;
          without warranties of any kind. We may change, suspend, or discontinue any
          part of the service at any time.
        </p>

        <h2>Your account</h2>
        <p>
          You are responsible for your account and for activity that happens under it.
          Keep your credentials secure. You must be at least 13 years old to use
          RoleCall.
        </p>

        <h2>Your content</h2>
        <p>
          You retain all rights to the scripts and other content you upload. You grant
          us only the license needed to store, display, and process that content to
          operate the service for you and your project members. You are responsible for
          having the rights to the content you upload and for what you share with your
          team.
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>No unlawful, infringing, or harmful content.</li>
          <li>No attempts to break, probe, or overload the service.</li>
          <li>No accessing other users&apos; projects without authorization.</li>
        </ul>

        <h2>Advertising</h2>
        <p>
          The service is supported by advertising served by Google AdSense. Ad
          personalization and cookie choices are described in our{" "}
          <Link href="/privacy" className="text-red-600 underline">
            Privacy Policy
          </Link>
          .
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, RoleCall and its operator are not
          liable for indirect, incidental, special, or consequential damages, or for
          loss of data, arising from your use of the service. Production planning
          decisions remain your responsibility — always double-check call times.
        </p>

        <h2>Termination</h2>
        <p>
          You can stop using the service at any time and delete your projects in the
          app. We may suspend or terminate accounts that violate these terms.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms; continued use after a change means you accept the
          updated terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions: open an issue at{" "}
          <a href="https://github.com/taylordrew4u2/Role-Call" className="text-red-600 underline" target="_blank" rel="noopener noreferrer">
            github.com/taylordrew4u2/Role-Call
          </a>{" "}
          or email skatematesnyc@gmail.com.
        </p>
      </div>
    </main>
  );
}
