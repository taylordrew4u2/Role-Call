import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RoleCall — Film Production Planning for Indie Filmmakers",
    template: "%s · RoleCall",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "film production app",
    "shot list generator",
    "shot list from script",
    "script breakdown software",
    "call sheet app",
    "film crew roles",
    "indie film production",
    "student film planning",
    "screenplay editor online",
    "production scheduling",
  ],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "RoleCall — Film Production Planning for Indie Filmmakers",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "RoleCall — Film Production Planning for Indie Filmmakers",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

async function NavAuth() {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    // Clerk not configured or middleware unreachable — show sign-in buttons
  }

  if (userId) return <UserButton />;

  return (
    <>
      <SignInButton fallbackRedirectUrl="/dashboard" />
      <SignUpButton fallbackRedirectUrl="/dashboard" />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <ClerkProvider>
          <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-end gap-3 print:hidden">
            <NavAuth />
          </header>
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
