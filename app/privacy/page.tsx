import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How RoleCall collects, uses, and protects your information, including cookies and advertising.",
};

const EFFECTIVE_DATE = "July 3, 2026";

export default function PrivacyPage() {
  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold text-lg text-slate-900 mb-8"
      >
        <Clapperboard className="h-5 w-5 text-red-600" />
        RoleCall
      </Link>

      <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <div className="prose prose-slate mt-8 max-w-none text-slate-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 text-[15px] leading-relaxed">
        <p>
          RoleCall (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a film-production planning app.
          This policy explains what information we collect, how we use it, and the
          choices you have.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>
            <strong>Account information.</strong> When you sign up, our authentication
            provider (Clerk) collects your name, email address, and login credentials.
          </li>
          <li>
            <strong>Content you create.</strong> Projects, scripts, shot lists, schedules,
            team member names, and shoot locations you enter are stored in our database so
            your team can use them.
          </li>
          <li>
            <strong>Usage data.</strong> Standard server logs (IP address, browser type,
            pages requested) collected by our hosting provider (Vercel) for security and
            reliability.
          </li>
          <li>
            <strong>Cookies and similar technologies.</strong> We use cookies for
            authentication sessions, and third parties (below) may set cookies for
            advertising and analytics.
          </li>
        </ul>

        <h2>Advertising (Google AdSense)</h2>
        <p>
          We use Google AdSense to show ads. Google and its partners use cookies —
          including the DoubleClick cookie — to serve ads based on your visits to this
          and other websites. Third-party vendors, including Google, use cookies to
          serve ads based on prior visits to this site or other sites.
        </p>
        <ul>
          <li>
            Google&apos;s use of advertising cookies enables it and its partners to serve
            ads based on your visits to this site and/or other sites on the Internet.
          </li>
          <li>
            You may opt out of personalized advertising by visiting{" "}
            <a href="https://adssettings.google.com" className="text-red-600 underline" target="_blank" rel="noopener noreferrer">
              Google Ads Settings
            </a>{" "}
            or{" "}
            <a href="https://www.aboutads.info/choices" className="text-red-600 underline" target="_blank" rel="noopener noreferrer">
              aboutads.info/choices
            </a>
            .
          </li>
          <li>
            Details on how Google uses data from sites that use its services are at{" "}
            <a href="https://policies.google.com/technologies/partner-sites" className="text-red-600 underline" target="_blank" rel="noopener noreferrer">
              policies.google.com/technologies/partner-sites
            </a>
            .
          </li>
        </ul>
        <p>
          If you are in the European Economic Area, the United Kingdom, or Switzerland,
          you will be asked for consent before personalized ads are shown, as required
          by law.
        </p>

        <h2>How we use information</h2>
        <ul>
          <li>To provide and operate the service (projects, teams, schedules).</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To maintain, debug, and improve the app.</li>
          <li>To display advertising that supports the free service.</li>
        </ul>

        <h2>Sharing</h2>
        <p>
          We do not sell your personal information. Content you add to a project is
          visible to that project&apos;s members. We share data only with the service
          providers that run the app — Clerk (authentication), Vercel (hosting and
          storage), Neon (database), Google (advertising), and, if configured, Resend
          (invite emails) and OpenStreetMap/Nominatim (location geocoding) — each under
          their own privacy policies.
        </p>

        <h2>Data retention &amp; deletion</h2>
        <p>
          Your content is kept while your account is active. You can delete projects at
          any time from the app; deleting a project removes its scripts, shots,
          schedules, and member records. To delete your account and associated data,
          contact us and we will action it promptly.
        </p>

        <h2>Children</h2>
        <p>
          RoleCall is not directed to children under 13, and we do not knowingly collect
          personal information from them.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live (e.g., GDPR in the EU, CCPA/CPRA in California),
          you may have rights to access, correct, delete, or port your personal
          information, and to opt out of targeted advertising. Contact us to exercise
          these rights.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy; material changes will be reflected by a new
          effective date on this page.
        </p>

        <h2>Contact</h2>
        <p>
          Questions or requests: open an issue at{" "}
          <a href="https://github.com/taylordrew4u2/Role-Call" className="text-red-600 underline" target="_blank" rel="noopener noreferrer">
            github.com/taylordrew4u2/Role-Call
          </a>{" "}
          or email taylordrew4u@gmail.com.
        </p>
      </div>
    </main>
  );
}
