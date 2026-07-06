"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, CirclePlus, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/new", label: "New", icon: CirclePlus },
  { href: "/guides", label: "Guides", icon: BookOpen },
];

/** Sticky bottom tab bar for top-level pages (dashboard, series) — phone only. */
export function AppBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <nav
      className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main sections"
    >
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors",
                active ? "text-red-600" : "text-slate-400 active:text-slate-600"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="truncate max-w-full px-0.5">{tab.label}</span>
            </Link>
          );
        })}
        <div className="flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium text-slate-400">
          <UserButton appearance={{ elements: { avatarBox: "h-5 w-5" } }} />
          <span className="truncate max-w-full px-0.5">Account</span>
        </div>
      </div>
    </nav>
  );
}
