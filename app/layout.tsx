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

export const metadata: Metadata = {
  title: "RoleCall — Film Production Role Tracker",
  description:
    "Assign every responsibility on your short film so nothing falls through the cracks on shoot day.",
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
