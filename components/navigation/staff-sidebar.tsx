"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardPlus,
  CreditCard,
  Building2,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Users,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

export type StaffSidebarLink = {
  href: string;
  label: string;
  badgeCount?: number;
};

const icons = {
  "/calendar": CalendarDays,
  "/patients": Users,
  "/clinical": Stethoscope,
  "/billing": CreditCard,
  "/reports": BarChart3,
  "/practice/staff": Building2,
  "/practice/settings": Settings,
  "/patients/new": ClipboardPlus,
  "/messages": MessageSquare,
  "/break-glass": ShieldAlert,
};

export function StaffSidebar({ links }: { links: StaffSidebarLink[] }) {
  const pathname = usePathname();
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(links.map((link) => [link.href, link.badgeCount ?? 0]))
  );

  useEffect(() => {
    let active = true;

    fetch("/api/messages/unread-count", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { count?: number } | null) => {
        if (active && typeof data?.count === "number") {
          setBadgeCounts((counts) => ({ ...counts, "/messages": data.count ?? 0 }));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-20 flex-col border-r border-[#273444] bg-[#091827] pt-[96px] md:flex lg:w-[270px]">
      <nav className="flex-1 px-3 pt-3 lg:px-5" aria-label="Staff navigation">
        <div className="space-y-2">
          {links.map((link) => {
            const Icon =
              icons[link.href as keyof typeof icons] ?? LayoutDashboard;
            const active =
              pathname === link.href ||
              pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex min-h-12 items-center justify-center gap-4 rounded-lg px-3 text-[17px] font-semibold transition-colors lg:justify-start lg:px-4 ${
                  active
                    ? "bg-[#315a6b] text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/7 hover:text-white"
                }`}
              >
                <Icon className="size-5 shrink-0" strokeWidth={2} />
                <span className="hidden lg:inline">{link.label}</span>
                {badgeCounts[link.href] > 0 ? (
                  <span className="absolute right-1 top-0 flex size-5 items-center justify-center rounded-full border-2 border-[#091827] bg-[#dc2626] text-[10px] font-bold leading-none text-white lg:relative lg:right-auto lg:top-auto lg:ml-auto lg:size-6 lg:border-white lg:text-[11px]">
                    {badgeCounts[link.href] > 99 ? "99+" : badgeCounts[link.href]}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
