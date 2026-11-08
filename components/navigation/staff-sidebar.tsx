"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

export type StaffSidebarLink = {
  href: string;
  label: string;
  badgeCount?: number;
};

const icons = {
  "/today": LayoutDashboard,
  "/calendar": CalendarDays,
  "/patients": Users,
  "/clinical": Stethoscope,
  "/billing": CreditCard,
  "/reports": BarChart3,
  "/practice/staff": Building2,
  "/practice/settings": Settings,
  "/patients/new": ClipboardPlus,
  "/messages": MessageSquare,
};

export function StaffSidebar({ links }: { links: StaffSidebarLink[] }) {
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-20 flex-col border-r border-[#273444] bg-[#091827] pt-[96px] md:flex lg:w-[270px]">
      <nav className="flex-1 px-3 pt-3 lg:px-5" aria-label="Staff navigation">
        <div className="space-y-2">
          {links.map((link) => {
            const Icon =
              icons[link.href as keyof typeof icons] ?? LayoutDashboard;
            const active =
              pathname === link.href ||
              (link.href !== "/today" && pathname.startsWith(`${link.href}/`));

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
                {link.badgeCount && link.badgeCount > 0 ? (
                  <span className="absolute right-2 top-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#dc2626] text-[11px] font-bold leading-none text-white lg:right-3 lg:top-2">
                    {link.badgeCount > 99 ? "99+" : link.badgeCount}
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
