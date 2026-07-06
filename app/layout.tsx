import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/Toaster";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NavAuth } from "@/components/NavAuth";
import { cn } from "@/lib/utils";
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
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
};

export const viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  // Extend the layout under notches / home indicators so safe-area
  // insets (used by the mobile bottom nav) work.
  viewportFit: "cover" as const,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  // Per-request CSP nonce generated in proxy.ts; required on the AdSense
  // script under the strict (nonce-based) Content Security Policy.
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  // Dashboard, project, and series pages render their own header (logo,
  // back button, page actions) with a UserButton already in it — showing
  // this generic one too would stack two account buttons on one screen.
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const hasOwnHeader =
    pathname === "/dashboard" ||
    (pathname.startsWith("/dashboard/") && !pathname.startsWith("/dashboard/new"));

  // The homepage has its own nav row (logo + Guides); on mobile it folds
  // this auth header into that row instead of stacking two bars, but keeps
  // the standalone bar on desktop where the two-row look has always been.
  const isHomepage = pathname === "/";

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="google-adsense-account" content="ca-pub-6785541334207915" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6785541334207915"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
          nonce={nonce}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <ClerkProvider>
          {!hasOwnHeader && (
            <header
              className={cn(
                "sticky top-0 z-30 border-b border-slate-200 bg-white px-6 py-4 items-center justify-end gap-3 print:hidden",
                isHomepage ? "hidden sm:flex" : "flex"
              )}
            >
              <NavAuth />
            </header>
          )}
          {children}
          <Toaster />
          <ServiceWorkerRegistrar />
          <OfflineIndicator />
          <InstallPrompt />
        </ClerkProvider>
      </body>
    </html>
  );
}
