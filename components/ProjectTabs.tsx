"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, FileText, Clapperboard, CalendarDays, Drama } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectTabs({ projectId }: { projectId: number }) {
  const pathname = usePathname();
  const base = `/dashboard/${projectId}`;

  const tabs = [
    { href: base, label: "Roles", icon: Users },
    { href: `${base}/cast`, label: "Cast", icon: Drama },
    { href: `${base}/script`, label: "Script", icon: FileText },
    { href: `${base}/shots`, label: "Shot List", icon: Clapperboard },
    { href: `${base}/schedule`, label: "Schedule", icon: CalendarDays },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 print:hidden">
      <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active =
            tab.href === base ? pathname === base : pathname.startsWith(tab.href);
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
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
