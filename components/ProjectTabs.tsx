"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, Clapperboard, CalendarDays, SplitSquareHorizontal, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectTabs({ projectId }: { projectId: number }) {
  const pathname = usePathname();
  const base = `/dashboard/${projectId}`;

  const tabs = [
    { href: base, label: "Team", longLabel: "Team", icon: Users },
    { href: `${base}/script`, label: "Script", longLabel: "Script", icon: FileText },
    { href: `${base}/shots`, label: "Shots", longLabel: "Shot List", icon: Clapperboard },
    { href: `${base}/breakdown`, label: "Breakdown", longLabel: "Breakdown", icon: SplitSquareHorizontal },
    { href: `${base}/schedule`, label: "Schedule", longLabel: "Schedule", icon: CalendarDays },
    { href: `${base}/locations`, label: "Locations", longLabel: "Locations", icon: MapPin },
  ];

  const isActive = (href: string) =>
    href === base ? pathname === base : pathname.startsWith(href);

  return (
    <>
      {/* Desktop / tablet: top tab strip */}
      <nav className="hidden sm:block bg-white border-b border-slate-200 px-4 sm:px-6 print:hidden">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                  active
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.longLabel}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Phone: fixed bottom tab bar, like a native app */}
      <nav
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Project sections"
      >
        <div className="grid grid-cols-6">
          {tabs.map((tab) => {
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
        </div>
      </nav>
    </>
  );
}
